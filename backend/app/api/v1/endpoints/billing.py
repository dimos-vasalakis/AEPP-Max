"""The Diamond plan through Stripe: the student's plan, Checkout to subscribe, the
Customer Portal to cancel or change the card, and the webhook that tells us.

Only Stripe decides who is Diamond. On a signed webhook event (or a sync the
student's page asks for after paying), we lock the student's row and read all of
their subscriptions from Stripe, never just the event's (events arrive out of
order, and a student could end up with two), and keep the one that decides the
plan in `subscriptions` (migration 0007, backend only). Only subscriptions to
STRIPE_PRICE_ID count.
"""

import logging
import uuid
from datetime import UTC, datetime
from functools import lru_cache
from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import get_settings, is_unset
from app.core.db import DbSession, has_migration
from app.core.plans import DIAMOND_STATUSES, Effort, PlanName, get_plan, is_diamond
from app.core.security import CurrentUserDep
from app.models import Subscription

router = APIRouter(prefix="/billing", tags=["billing"])
logger = logging.getLogger("uvicorn.error")

# The events that may change a subscription; each one is re-read from Stripe.
SUBSCRIPTION_EVENTS = frozenset(
    {
        "checkout.session.completed",
        "customer.subscription.created",
        "customer.subscription.updated",
        "customer.subscription.deleted",
        "customer.subscription.paused",
        "customer.subscription.resumed",
    }
)


@lru_cache
def stripe_client() -> stripe.StripeClient:
    # httpx, so the *_async calls don't block the event loop.
    return stripe.StripeClient(get_settings().stripe_secret_key, http_client=stripe.HTTPXClient())


def billing_configured() -> bool:
    """All three keys: without the webhook's, students could pay and never become Diamond."""
    settings = get_settings()
    keys = (settings.stripe_secret_key, settings.stripe_price_id, settings.stripe_webhook_secret)
    return not any(is_unset(key) for key in keys)


async def require_billing() -> None:
    if not billing_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Billing is not configured")


# Dependencies run in parameter order: auth (401), then this (503), then the DB.
BillingReady = Annotated[None, Depends(require_billing)]


async def require_subscriptions(db: AsyncSession) -> None:
    """The subscriptions table (migration 0007); migrations don't run on deploy."""
    if not await has_migration(db, "0007"):
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Billing needs migration 0007")


def site(request: Request) -> str:
    """Where Stripe sends the student back: the page that asked, if it's ours."""
    origins = get_settings().cors_origins
    origin = request.headers.get("origin")
    return origin if origin in origins else origins[0]


class PlanOut(BaseModel):
    plan: PlanName
    status: str | None  # Stripe's, when there is a subscription
    renews_at: datetime | None  # the current period's end: renewal, or the end if cancelled
    cancel_at_period_end: bool
    can_buy: bool  # Stripe is configured
    daily_tokens: int
    max_programs: int
    max_themes: int
    efforts: list[Effort]


class RedirectOut(BaseModel):
    url: str


def plan_out(row: Subscription | None) -> PlanOut:
    plan = get_plan("diamond" if is_diamond(row) else "free")
    has_sub = row is not None and row.status != "none"
    return PlanOut(
        plan=plan.name,
        status=row.status if has_sub else None,  # type: ignore[union-attr]
        renews_at=row.current_period_end if has_sub else None,  # type: ignore[union-attr]
        cancel_at_period_end=bool(has_sub and row.cancel_at_period_end),  # type: ignore[union-attr]
        can_buy=billing_configured(),
        daily_tokens=plan.daily_tokens,
        max_programs=plan.max_programs,
        max_themes=plan.max_themes,
        efforts=list(plan.efforts),
    )


@router.get("")
async def my_plan(user: CurrentUserDep, db: DbSession) -> PlanOut:
    """The student's plan and its limits."""
    row = await db.get(Subscription, user.id) if await has_migration(db, "0007") else None
    return plan_out(row)


def is_diamond_price(sub: stripe.Subscription) -> bool:
    price = get_settings().stripe_price_id
    return any(item.price.id == price for item in sub["items"].data)


def deciding_subscription(subs: list[stripe.Subscription]) -> stripe.Subscription | None:
    """The subscription that sets the plan: the newest Diamond one that keeps it on,
    or else the newest Diamond one (ended). Other prices never count."""
    ours = [sub for sub in subs if is_diamond_price(sub)]
    live = [sub for sub in ours if sub.status in DIAMOND_STATUSES]
    pool = live or ours
    return max(pool, key=lambda sub: sub.created) if pool else None


def apply_subscription(row: Subscription, sub: stripe.Subscription | None) -> None:
    """Copy the deciding subscription (None: there is none) onto the student's row."""
    row.updated_at = func.now()
    if sub is None:
        row.stripe_subscription_id = None
        row.status = "none"
        row.current_period_end = None
        row.cancel_at_period_end = False
        return
    row.stripe_subscription_id = sub.id
    row.status = sub.status
    # Stripe keeps the billing period on the subscription's item.
    items = sub["items"].data
    end = items[0].current_period_end if items else None
    row.current_period_end = datetime.fromtimestamp(end, UTC) if end else None
    row.cancel_at_period_end = bool(sub.cancel_at_period_end or sub.cancel_at)


async def sync(row: Subscription) -> None:
    """Read all of the customer's subscriptions from Stripe onto `row`, which the
    caller holds locked (FOR UPDATE), so an older read can't overwrite a newer one."""
    subs = await stripe_client().v1.subscriptions.list_async(
        {"customer": row.stripe_customer_id, "status": "all", "limit": 100}
    )
    apply_subscription(row, deciding_subscription(subs.data))


async def locked(db: AsyncSession, *where: object) -> Subscription | None:
    return await db.scalar(select(Subscription).where(*where).with_for_update())  # type: ignore[arg-type]


@router.post("/checkout")
async def checkout(
    request: Request, user: CurrentUserDep, _: BillingReady, db: DbSession
) -> RedirectOut:
    """A Stripe Checkout page for Diamond; the webhook switches the plan once paid."""
    await require_subscriptions(db)
    # One at a time per student (two tabs), so they get one Stripe customer, even before
    # the row exists to lock. Released at commit.
    await db.execute(select(func.pg_advisory_xact_lock(func.hashtext(f"billing:{user.id}"))))
    row = await locked(db, Subscription.user_id == user.id)
    client = stripe_client()
    try:
        if row is not None:
            # From Stripe, not the row: a webhook that hasn't landed must not let them pay twice.
            await sync(row)
            if is_diamond(row):
                await db.commit()
                raise HTTPException(status.HTTP_409_CONFLICT, "Already Diamond")
            # Only the newest Checkout can be paid: an older one left open in another tab
            # would start a second subscription.
            sessions = await client.v1.checkout.sessions.list_async(
                {"customer": row.stripe_customer_id, "status": "open", "limit": 100}
            )
            for old in sessions.data:
                await client.v1.checkout.sessions.expire_async(old.id)
        else:
            params: stripe.CustomerCreateParams = {"metadata": {"user_id": str(user.id)}}
            if user.email:
                params["email"] = user.email
            customer = await client.v1.customers.create_async(params)
            row = Subscription(user_id=user.id, stripe_customer_id=customer.id)
            db.add(row)
        here = site(request)
        session = await client.v1.checkout.sessions.create_async(
            {
                "mode": "subscription",
                "customer": row.stripe_customer_id,
                "line_items": [{"price": get_settings().stripe_price_id, "quantity": 1}],
                "client_reference_id": str(user.id),
                "subscription_data": {"metadata": {"user_id": str(user.id)}},
                "success_url": f"{here}/?diamond=welcome",
                "cancel_url": f"{here}/?diamond=cancel",
            }
        )
    except stripe.StripeError as err:
        logger.exception("Stripe checkout failed for user %s", user.id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not start the payment") from err
    await db.commit()
    assert session.url is not None  # hosted Checkout always has one
    return RedirectOut(url=session.url)


@router.post("/sync")
async def sync_plan(user: CurrentUserDep, _: BillingReady, db: DbSession) -> PlanOut:
    """The plan read from Stripe now, for the page back from Checkout: it doesn't
    have to wait for the webhook (or survive one that never comes)."""
    await require_subscriptions(db)
    row = await locked(db, Subscription.user_id == user.id)
    if row is not None:
        try:
            await sync(row)
        except stripe.StripeError as err:
            logger.exception("Stripe sync failed for user %s", user.id)
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not read Stripe") from err
        await db.commit()
    return plan_out(row)


@router.post("/portal")
async def portal(
    request: Request, user: CurrentUserDep, _: BillingReady, db: DbSession
) -> RedirectOut:
    """Stripe's Customer Portal: cancel, change the card, see the invoices."""
    await require_subscriptions(db)
    row = await db.get(Subscription, user.id)
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "No subscription")
    try:
        session = await stripe_client().v1.billing_portal.sessions.create_async(
            {"customer": row.stripe_customer_id, "return_url": f"{site(request)}/"}
        )
    except stripe.StripeError as err:
        logger.exception("Stripe portal failed for user %s", user.id)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not open the portal") from err
    return RedirectOut(url=session.url)


@router.post("/webhook", include_in_schema=False)
async def webhook(request: Request, db: DbSession) -> Response:
    """Stripe's events. Answers 2xx once handled; anything else makes Stripe retry."""
    if not billing_configured():
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Billing is not configured")
    try:
        event = stripe_client().construct_event(
            await request.body(),
            request.headers.get("stripe-signature"),
            get_settings().stripe_webhook_secret,
        )
    except (ValueError, stripe.SignatureVerificationError) as err:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid signature") from err
    # Checkout sessions and subscriptions both name the customer (not a dict: no .get()).
    obj = event.data.object
    customer = getattr(obj, "customer", None) if event.type in SUBSCRIPTION_EVENTS else None
    if not isinstance(customer, str):
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    await require_subscriptions(db)
    # Lock first, then read Stripe: a slower handler of an older event can't then
    # write over what a newer one found.
    row = await locked(db, Subscription.stripe_customer_id == customer)
    if row is None:
        # Not a customer our checkout made (e.g. one made by hand in the dashboard).
        logger.warning("Event %s is for unknown customer %s", event.id, customer)
        return Response(status_code=status.HTTP_204_NO_CONTENT)
    try:
        await sync(row)
    except stripe.StripeError as err:
        logger.exception("Could not read the subscriptions of %s", customer)
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not read Stripe") from err
    await db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


async def delete_customer(db: AsyncSession, user_id: uuid.UUID) -> None:
    """Before an account goes: delete its Stripe customer, which cancels its
    subscriptions at once (no more charges) and drops the saved card."""
    if not await has_migration(db, "0007"):
        return
    row = await db.get(Subscription, user_id)
    if row is None:
        return
    if not billing_configured():
        if is_diamond(row):
            # Deleting now would leave Stripe charging an account that's gone.
            raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, "Billing is not configured")
        return
    try:
        await stripe_client().v1.customers.delete_async(row.stripe_customer_id)
    except stripe.InvalidRequestError as err:
        if err.code != "resource_missing":  # already gone is what we wanted
            raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not cancel Diamond") from err
    except stripe.StripeError as err:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, "Could not cancel Diamond") from err
    # Gone from Stripe: if the account's own deletion then fails, a later checkout
    # makes a new customer instead of failing on this one.
    await db.delete(row)
    await db.commit()
