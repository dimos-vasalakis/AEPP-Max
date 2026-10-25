import asyncio

import httpx
import pytest
from fastapi import HTTPException
from fastapi.testclient import TestClient

from app.api.v1.endpoints.account import delete_auth_user
from app.core.config import get_settings
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
