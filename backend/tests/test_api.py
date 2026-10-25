from fastapi.testclient import TestClient

from tests.conftest import auth_header


def test_health(client: TestClient) -> None:
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_programs_require_auth(client: TestClient) -> None:
    assert client.get("/api/v1/programs").status_code == 401


def test_agent_requires_auth(client: TestClient) -> None:
    res = client.post("/api/v1/agent/chat", json={"message": "Γεια", "code": ""})
    assert res.status_code == 401


def test_agent_unconfigured_is_503(client: TestClient) -> None:
    res = client.post(
        "/api/v1/agent/chat", json={"message": "Γεια", "code": ""}, headers=auth_header()
    )
    assert res.status_code == 503
    assert res.json()["detail"] == "Agent is not configured"


def test_run_rejects_oversized_source(client: TestClient) -> None:
    res = client.post("/api/v1/run", json={"code": "Α" * 50_001})
    assert res.status_code == 422
