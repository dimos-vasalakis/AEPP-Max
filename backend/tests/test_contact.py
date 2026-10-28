from collections.abc import Callable, Iterator

import pytest
from fastapi.testclient import TestClient

from app.api.v1.endpoints import contact
from app.core.db import get_db
from app.models import ContactMessage

MESSAGE = {"name": "Μαρία", "email": "maria@example.com", "message": "Γεια σας!"}


class FakeDb:
    """Just enough of an AsyncSession for contact.py: `counts` answers its three counts
    (the last hour, the last day, this email's last day)."""

    def __init__(self, counts: tuple[int, int, int] = (0, 0, 0)):
        self.counts = list(counts)
        self.added: list[object] = []
        self.commits = 0

    async def execute(self, *_):
        return None

    async def scalar(self, *_):
        return self.counts.pop(0)

    def add(self, obj):
        self.added.append(obj)

    async def commit(self):
        self.commits += 1


@pytest.fixture
def use_db(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> Iterator[Callable[[FakeDb], FakeDb]]:
    """Serves the given FakeDb to the endpoint, as if migration 0008 ran."""

    async def migrated(*_):
        return True

    monkeypatch.setattr(contact, "has_migration", migrated)

    def use(db: FakeDb) -> FakeDb:
        async def fake():
            yield db

        monkeypatch.setitem(client.app.dependency_overrides, get_db, fake)
        return db

    yield use


def test_contact_without_a_database_is_503(client: TestClient) -> None:
    assert client.post("/api/v1/contact", json=MESSAGE).status_code == 503


def test_contact_stores_the_message(client: TestClient, use_db) -> None:
    db = use_db(FakeDb())
    body = {**MESSAGE, "name": "  Μαρία ", "message": "\nΓεια σας!  "}
    assert client.post("/api/v1/contact", json=body).status_code == 204
    [stored] = db.added
    assert isinstance(stored, ContactMessage)
    assert (stored.name, stored.email, stored.message) == ("Μαρία", MESSAGE["email"], "Γεια σας!")
    assert db.commits == 1


@pytest.mark.parametrize(
    "change",
    [{"email": "maria"}, {"name": "   "}, {"message": ""}, {"message": "α" * 2001}],
)
def test_contact_rejects_invalid_fields(client: TestClient, use_db, change: dict) -> None:
    db = use_db(FakeDb())
    assert client.post("/api/v1/contact", json={**MESSAGE, **change}).status_code == 422
    assert db.added == []


def test_contact_drops_what_bots_send(client: TestClient, use_db) -> None:
    db = use_db(FakeDb())
    body = {**MESSAGE, "website": "https://spam.example"}
    assert client.post("/api/v1/contact", json=body).status_code == 204
    assert db.added == [] and db.commits == 0


@pytest.mark.parametrize(
    "counts",
    [(contact.HOURLY_LIMIT, 0, 0), (0, contact.DAILY_LIMIT, 0), (0, 0, contact.DAILY_PER_EMAIL)],
)
def test_contact_limits_messages(client: TestClient, use_db, counts: tuple[int, int, int]) -> None:
    db = use_db(FakeDb(counts))
    res = client.post("/api/v1/contact", json=MESSAGE)
    assert res.status_code == 429
    assert res.json()["detail"] == "Too many messages"
    # Committed anyway: the expired messages' delete must not wait for a message that passes.
    assert db.added == [] and db.commits == 1


def test_contact_needs_its_migration(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, use_db
) -> None:
    async def missing(*_):
        return False

    use_db(FakeDb())
    monkeypatch.setattr(contact, "has_migration", missing)
    res = client.post("/api/v1/contact", json=MESSAGE)
    assert res.status_code == 503
    assert res.json()["detail"] == "Contact needs migration 0008"
