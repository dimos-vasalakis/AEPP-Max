import re
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pydantic import ValidationError

from app.schemas.program import ProgramCreate
from tests.conftest import auth_header


def test_health(client: TestClient) -> None:
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_programs_require_auth(client: TestClient) -> None:
    some = "/api/v1/programs/00000000-0000-0000-0000-000000000000"
    assert client.get("/api/v1/programs").status_code == 401
    assert client.post("/api/v1/programs", json={"title": "Άσκηση"}).status_code == 401
    assert client.get(some).status_code == 401
    assert client.patch(some, json={"code": ""}).status_code == 401
    assert client.delete(some).status_code == 401


def test_programs_without_a_database_are_503(client: TestClient) -> None:
    res = client.get("/api/v1/programs", headers=auth_header())
    assert res.status_code == 503


def test_a_saved_program_is_glossa_or_pseudocode() -> None:
    assert ProgramCreate(title="Άσκηση").language == "glossa"
    assert ProgramCreate(title="Άσκηση", language="pseudocode").language == "pseudocode"
    with pytest.raises(ValidationError):
        ProgramCreate(title="Άσκηση", language="python")  # type: ignore[arg-type]
    with pytest.raises(ValidationError):
        ProgramCreate(title="")


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


def test_check_valid_program(client: TestClient) -> None:
    res = client.post("/api/v1/check", json={"code": "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"})
    assert res.status_code == 200
    assert res.json() == {"error": None}


def test_check_reports_first_error_with_position(client: TestClient) -> None:
    res = client.post(
        "/api/v1/check", json={"code": "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  ΓΡΑΨΕ y\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"}
    )
    assert res.json()["error"] == {
        "kind": "syntax",
        "message": "Η μεταβλητή y δεν έχει δηλωθεί.",
        "line": 3,
        "column": 9,
        "end_column": 10,
    }


def test_run_returns_syntax_errors(client: TestClient) -> None:
    res = client.post(
        "/api/v1/run", json={"code": "ΠΡΟΓΡΑΜΜΑ Α\nΑΡΧΗ\n  x = 1\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"}
    )
    assert res.status_code == 200
    assert res.json()["status"] == "error"


def test_run_runs_a_program_and_asks_for_input(client: TestClient) -> None:
    code = (
        "ΠΡΟΓΡΑΜΜΑ Α\nΜΕΤΑΒΛΗΤΕΣ\n  ΑΚΕΡΑΙΕΣ: x\nΑΡΧΗ\n"
        "  ΓΡΑΨΕ 'Δώσε αριθμό: '\n  ΔΙΑΒΑΣΕ x\n  ΓΡΑΨΕ x * x\nΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ"
    )
    first = client.post("/api/v1/run", json={"code": code})
    assert first.status_code == 200
    assert first.json()["status"] == "needs_input"
    assert first.json()["output"] == ["Δώσε αριθμό:"]

    done = client.post("/api/v1/run", json={"code": code, "inputs": ["7"], "trace": True})
    body = done.json()
    assert body["status"] == "ok"
    assert body["output"] == ["Δώσε αριθμό:", "49"]
    assert [step["line"] for step in body["trace"]] == [5, 6, 7]


async def free_plan(*_):
    from app.core.plans import get_plan

    return get_plan("free")


def test_agent_refuses_an_effort_beyond_the_plan(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.v1.endpoints import agent
    from app.core.config import get_settings
    from app.core.db import get_db

    async def no_db():
        yield None

    async def migrated(*_):
        return True

    monkeypatch.setattr(get_settings(), "openai_api_key", "sk-test")
    monkeypatch.setattr(agent, "has_migration", migrated)
    monkeypatch.setattr(agent, "plan_for", free_plan)
    monkeypatch.setitem(client.app.dependency_overrides, get_db, no_db)
    body = {"message": "Γεια", "code": "", "effort": "high"}
    res = client.post("/api/v1/agent/chat", json=body, headers=auth_header())
    assert res.status_code == 403  # high is Diamond's


def test_agent_refuses_past_the_daily_limit(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from app.api.v1.endpoints import agent
    from app.core.config import get_settings
    from app.core.db import get_db

    async def no_db():  # the checks before the limit are patched out
        yield None

    async def migrated(*_):
        return True

    async def over_limit(*_):
        return False

    monkeypatch.setattr(get_settings(), "openai_api_key", "sk-test")
    monkeypatch.setattr(agent, "has_migration", migrated)
    monkeypatch.setattr(agent, "reserve_message", over_limit)
    monkeypatch.setattr(agent, "plan_for", free_plan)
    monkeypatch.setitem(client.app.dependency_overrides, get_db, no_db)
    res = client.post(
        "/api/v1/agent/chat", json={"message": "Γεια", "code": ""}, headers=auth_header()
    )
    assert res.status_code == 429
    assert res.json()["detail"] == "Daily agent limit reached"


def test_agent_needs_its_migration(client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    from app.api.v1.endpoints import agent
    from app.core.config import get_settings
    from app.core.db import get_db

    async def no_db():
        yield None

    async def not_migrated(*_):
        return False

    monkeypatch.setattr(get_settings(), "openai_api_key", "sk-test")
    monkeypatch.setattr(agent, "has_migration", not_migrated)
    monkeypatch.setitem(client.app.dependency_overrides, get_db, no_db)
    res = client.post(
        "/api/v1/agent/chat", json={"message": "Γεια", "code": ""}, headers=auth_header()
    )
    assert res.status_code == 503


def test_negative_daily_limit_is_refused() -> None:
    from pydantic import ValidationError

    from app.core.config import Settings

    with pytest.raises(ValidationError):
        Settings(agent_daily_tokens=-1)


def test_agent_usage_requires_auth(client: TestClient) -> None:
    assert client.get("/api/v1/agent/usage").status_code == 401


def test_agent_usage_reports_today_and_the_limit(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    from datetime import UTC, datetime

    from app.api.v1.endpoints import agent
    from app.core.db import get_db

    async def no_db():
        yield None

    async def migrated(*_):
        return True

    async def today(*_):
        return 3_500, 2, datetime(2026, 10, 25, 22, tzinfo=UTC)

    monkeypatch.setattr(agent, "plan_for", free_plan)

    monkeypatch.setattr(agent, "has_migration", migrated)
    monkeypatch.setattr(agent, "read_usage", today)
    monkeypatch.setitem(client.app.dependency_overrides, get_db, no_db)
    res = client.get("/api/v1/agent/usage", headers=auth_header())
    assert res.status_code == 200
    body = res.json()
    assert body["tokens"] == 3_500 and body["messages"] == 2
    assert body["limit"] == 20_000
    assert body["resets_at"].startswith("2026-10-25T22:00:00")


def test_run_and_check_take_the_language(client: TestClient) -> None:
    algorithm = "Αλγόριθμος Α\nΔεδομένα // x //\ny ← 2 * x\nΑποτελέσματα // y //\nΤέλος Α"
    response = client.post(
        "/api/v1/run", json={"code": algorithm, "inputs": ["4"], "language": "pseudocode"}
    )
    assert response.status_code == 200
    assert response.json()["output"] == ["8"]
    check = client.post("/api/v1/check", json={"code": algorithm, "language": "pseudocode"})
    assert check.json() == {"error": None}
    as_program = client.post("/api/v1/check", json={"code": algorithm})
    assert "«Αλγόριθμος»" in as_program.json()["error"]["message"]


def test_health_checks_are_not_traced() -> None:
    from app.main import CHECK_RATE, TRACES_RATE, sample_traces

    # The path Render pings, read from render.yaml so the two can't drift apart.
    blueprint = (Path(__file__).parents[2] / "render.yaml").read_text()
    health = re.search(r"healthCheckPath:\s*(\S+)", blueprint)
    assert health is not None
    assert sample_traces({"asgi_scope": {"path": health.group(1)}}) == 0.0  # type: ignore[typeddict-item]
    assert sample_traces({"asgi_scope": {"path": "/api/v1/run"}}) == TRACES_RATE  # type: ignore[typeddict-item]
    # The browser's decision wins, so a trace isn't cut in half.
    assert sample_traces({"parent_sampled": False}) == 0.0  # type: ignore[typeddict-item]
    # Except for /check, sent after every pause in typing: a sampled page doesn't trace them all.
    check = {"asgi_scope": {"path": "/api/v1/check"}, "parent_sampled": True}
    assert sample_traces(check) == CHECK_RATE  # type: ignore[arg-type]
