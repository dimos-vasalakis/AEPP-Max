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
