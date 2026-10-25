import asyncio
from types import SimpleNamespace

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient
from sqlalchemy.exc import IntegrityError

from app.api.v1.endpoints.account import delete_auth_user
from app.core.config import get_settings
from app.core.db import revision_includes
from app.main import integrity_error
from tests.conftest import auth_header


def test_delete_account_requires_auth(client: TestClient) -> None:
    assert client.delete("/api/v1/account").status_code == 401


def test_delete_account_unconfigured_is_503(client: TestClient) -> None:
    res = client.delete("/api/v1/account", headers=auth_header())
    assert res.status_code == 503
    assert res.json()["detail"] == "Account deletion is not configured"


@pytest.fixture
def admin_settings(monkeypatch: pytest.MonkeyPatch) -> None:
    settings = get_settings()
    monkeypatch.setattr(settings, "supabase_url", "https://ref.supabase.co/")
    monkeypatch.setattr(settings, "supabase_secret_key", "sb_secret_test")


def _delete_with(status_code: int, seen: list[httpx.Request]) -> None:
    def handle(request: httpx.Request) -> httpx.Response:
        seen.append(request)
        return httpx.Response(status_code)

    asyncio.run(delete_auth_user("user-1", transport=httpx.MockTransport(handle)))


@pytest.mark.usefixtures("admin_settings")
def test_delete_auth_user_calls_the_admin_api() -> None:
    seen: list[httpx.Request] = []
    _delete_with(200, seen)
    [request] = seen
    assert request.method == "DELETE"
    assert str(request.url) == "https://ref.supabase.co/auth/v1/admin/users/user-1"
    assert request.headers["apikey"] == "sb_secret_test"
    assert request.headers["authorization"] == "Bearer sb_secret_test"


@pytest.mark.usefixtures("admin_settings")
def test_delete_auth_user_accepts_an_already_deleted_user() -> None:
    _delete_with(404, [])


@pytest.mark.usefixtures("admin_settings")
def test_delete_auth_user_reports_failures() -> None:
    with pytest.raises(HTTPException) as err:
        _delete_with(500, [])
    assert err.value.status_code == 502


@pytest.mark.usefixtures("admin_settings")
def test_delete_auth_user_reports_network_errors() -> None:
    def fail(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("unreachable", request=request)

    with pytest.raises(HTTPException) as err:
        asyncio.run(delete_auth_user("user-1", transport=httpx.MockTransport(fail)))
    assert err.value.status_code == 502


def test_revision_includes_follows_the_migration_chain() -> None:
    assert revision_includes("0002", "0002")
    assert not revision_includes("0001", "0002")
    assert not revision_includes(None, "0002")  # Alembic never ran
    assert not revision_includes("ffff_unknown_to_this_image", "0002")  # fails closed


def _integrity_error(constraint: str | None) -> IntegrityError:
    orig = SimpleNamespace(diag=SimpleNamespace(constraint_name=constraint))
    return IntegrityError("insert", {}, orig)  # type: ignore[arg-type]


@pytest.mark.parametrize(
    ("constraint", "status_code"),
    [
        ("programs_user_id_fkey", 401),
        ("conversations_user_id_fkey", 401),
        ("conversations_program_id_fkey", 404),
        ("title_length", 500),
        (None, 500),
    ],
)
def test_integrity_errors_map_to_responses(constraint: str | None, status_code: int) -> None:
    res = asyncio.run(integrity_error(None, _integrity_error(constraint)))  # type: ignore[arg-type]
    assert res.status_code == status_code
