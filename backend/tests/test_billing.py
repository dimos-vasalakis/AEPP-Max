import asyncio
import hashlib
import hmac
import json
import time
import uuid
from collections.abc import Iterator

import pytest
import stripe
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.endpoints import billing
from app.api.v1.endpoints.billing import apply_subscription, deciding_subscription
from app.core.plans import get_plan, is_diamond
from app.models import Subscription
from tests.conftest import auth_header

PRICE = "price_diamond"


def subscription(
    sid: str = "sub_1",
    status: str = "active",
    created: int = 1,
    price: str = PRICE,
    **extra: object,
) -> stripe.Subscription:
    data = {
        "id": sid,
        "object": "subscription",
        "status": status,
        "created": created,
        "customer": "cus_1",
        "cancel_at_period_end": False,
        "cancel_at": None,
        "items": {
            "object": "list",
            "data": [{"current_period_end": 1_800_000_000, "price": {"id": price}}],
        },
        **extra,
    }
    return stripe.Subscription.construct_from(data, "sk_test")


def row(**fields: object) -> Subscription:
    return Subscription(user_id=uuid.uuid4(), stripe_customer_id="cus_1", **fields)


@pytest.fixture
def stripe_on(monkeypatch: pytest.MonkeyPatch) -> Iterator[str]:
    from app.core.config import get_settings
    from app.core.db import get_db
    from app.main import app

    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_x")
    monkeypatch.setattr(settings, "stripe_price_id", PRICE)
    monkeypatch.setattr(settings, "stripe_webhook_secret", "whsec_test")

    async def no_db():
        yield FakeDb()

    async def migrated(*_):
        return True

    monkeypatch.setattr(billing, "has_migration", migrated)
    monkeypatch.setitem(app.dependency_overrides, get_db, no_db)
    real = billing.stripe_client  # a test may swap it for a fake
    real.cache_clear()
    yield "whsec_test"
    real.cache_clear()


class FakeDb:
    """Just enough of an AsyncSession for billing.py's calls."""

    def __init__(self, stored: Subscription | None = None):
        self.stored = stored
        self.deleted: list[object] = []
        self.commits = 0

    async def get(self, *_):
        return self.stored

    async def scalar(self, *_):
        return self.stored

    async def delete(self, obj):
        self.deleted.append(obj)

    async def commit(self):
        self.commits += 1


def test_plans_differ_where_promised() -> None:
    free, diamond = get_plan("free"), get_plan("diamond")
    assert free.max_programs < diamond.max_programs and free.max_themes < diamond.max_themes
    assert "high" not in free.efforts and "high" in diamond.efforts
    assert diamond.daily_tokens > free.daily_tokens


def test_a_live_subscription_decides_over_a_newer_ended_one(stripe_on: str) -> None:
    live = subscription("sub_old", "active", created=1)
    ended = subscription("sub_new", "canceled", created=2)
    assert deciding_subscription([ended, live]) is live
    # Two live ones (paid twice): the newest; cancelling one leaves the other deciding.
    newer = subscription("sub_2", "active", created=3)
    assert deciding_subscription([live, newer]) is newer
    assert deciding_subscription([live, subscription("sub_2", "canceled", created=3)]) is live


def test_only_the_diamond_price_counts(stripe_on: str) -> None:
    assert deciding_subscription([subscription(price="price_other")]) is None
    student = row(stripe_subscription_id="sub_1", status="active")
    apply_subscription(student, None)
    assert student.status == "none" and not is_diamond(student)


def test_cancelling_keeps_diamond_until_the_period_ends(stripe_on: str) -> None:
    student = row(status="none")
    apply_subscription(student, subscription(cancel_at_period_end=True))
    assert is_diamond(student) and student.cancel_at_period_end
    apply_subscription(student, subscription(status="canceled"))
    assert not is_diamond(student)


def test_billing_needs_stripe(client: TestClient) -> None:
    assert client.post("/api/v1/billing/checkout").status_code == 401
    assert client.post("/api/v1/billing/checkout", headers=auth_header()).status_code == 503
    assert client.post("/api/v1/billing/portal", headers=auth_header()).status_code == 503
    assert client.post("/api/v1/billing/sync", headers=auth_header()).status_code == 503


def test_billing_needs_the_webhook_secret_too(monkeypatch: pytest.MonkeyPatch) -> None:
    from app.core.config import get_settings

    settings = get_settings()
    monkeypatch.setattr(settings, "stripe_secret_key", "sk_test_x")
    monkeypatch.setattr(settings, "stripe_price_id", PRICE)
    assert not billing.billing_configured()


def signed(payload: bytes, secret: str) -> str:
    t = int(time.time())
    mac = hmac.new(secret.encode(), f"{t}.".encode() + payload, hashlib.sha256).hexdigest()
    return f"t={t},v1={mac}"


def post_event(client: TestClient, secret: str, type_: str, obj: dict) -> int:
    event = {"id": "evt_1", "object": "event", "type": type_, "data": {"object": obj}}
    payload = json.dumps(event).encode()
    res = client.post(
        "/api/v1/billing/webhook",
        content=payload,
        headers={"stripe-signature": signed(payload, secret)},
    )
    return res.status_code


def test_the_webhook_refuses_unsigned_events(client: TestClient, stripe_on: str) -> None:
    payload = json.dumps({"id": "evt_1", "object": "event", "type": "x"}).encode()
    res = client.post(
        "/api/v1/billing/webhook", content=payload, headers={"stripe-signature": "t=1,v1=bad"}
    )
    assert res.status_code == 400


def test_the_webhook_ignores_other_events_and_unknown_customers(
    client: TestClient, stripe_on: str
) -> None:
    assert (
        post_event(client, stripe_on, "invoice.created", {"id": "in_1", "customer": "cus_1"}) == 204
    )
    # FakeDb has no row for the customer: logged and acknowledged, not retried.
    sub = {"id": "sub_1", "object": "subscription", "customer": "cus_unknown"}
    assert post_event(client, stripe_on, "customer.subscription.updated", sub) == 204


class FakeCustomers:
    def __init__(self, error: Exception | None = None):
        self.error = error
        self.deleted: list[str] = []

    async def delete_async(self, customer: str) -> None:
        if self.error:
            raise self.error
        self.deleted.append(customer)


def fake_client(monkeypatch: pytest.MonkeyPatch, customers: FakeCustomers) -> None:
    class V1:
        pass

    class Client:
        v1 = V1()

    Client.v1.customers = customers  # type: ignore[attr-defined]
    monkeypatch.setattr(billing, "stripe_client", lambda: Client)


def test_deleting_an_account_deletes_its_stripe_customer(
    stripe_on: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    customers = FakeCustomers()
    fake_client(monkeypatch, customers)
    db = FakeDb(row(status="active"))
    asyncio.run(billing.delete_customer(db, uuid.uuid4()))  # type: ignore[arg-type]
    assert customers.deleted == ["cus_1"] and db.deleted == [db.stored] and db.commits == 1


def test_a_customer_already_gone_is_fine_but_other_errors_stop_the_deletion(
    stripe_on: str, monkeypatch: pytest.MonkeyPatch
) -> None:
    missing = stripe.InvalidRequestError("No such customer", "id", code="resource_missing")
    fake_client(monkeypatch, FakeCustomers(missing))
    db = FakeDb(row(status="active"))
    asyncio.run(billing.delete_customer(db, uuid.uuid4()))  # type: ignore[arg-type]
    assert db.deleted == [db.stored]

    fake_client(monkeypatch, FakeCustomers(stripe.APIConnectionError("down")))
    db = FakeDb(row(status="active"))
    with pytest.raises(HTTPException) as err:
        asyncio.run(billing.delete_customer(db, uuid.uuid4()))  # type: ignore[arg-type]
    assert err.value.status_code == 502 and db.deleted == []


def test_a_diamond_account_isnt_deleted_without_stripe(monkeypatch: pytest.MonkeyPatch) -> None:
    async def migrated(*_):
        return True

    monkeypatch.setattr(billing, "has_migration", migrated)
    with pytest.raises(HTTPException) as err:
        asyncio.run(billing.delete_customer(FakeDb(row(status="active")), uuid.uuid4()))  # type: ignore[arg-type]
    assert err.value.status_code == 503
    # Free (never paid, or ended): nothing at Stripe can charge it.
    asyncio.run(billing.delete_customer(FakeDb(row(status="canceled")), uuid.uuid4()))  # type: ignore[arg-type]
