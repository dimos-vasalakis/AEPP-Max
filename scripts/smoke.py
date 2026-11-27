#!/usr/bin/env python3
"""Smoke test for a running AEPP Max: the API, the website, or both.

    python3 scripts/smoke.py --api http://localhost:8000
    python3 scripts/smoke.py --api https://<render-app>.onrender.com --web https://<site>

Standard library only, so it runs anywhere (CI, a laptop, after a deploy) without the
backend's venv. It only reads: public endpoints, a few tiny programs on /run and /check,
and the protected endpoints without a token (they must answer 401). It never signs in,
saves, writes to the database, sends a contact message or calls the agent, so it is safe
against production. Render's free tier sleeps, so the first request waits up to --wait
seconds for the API to wake. Exits 1 if any check fails.
"""

import argparse
import json
import sys
import time
import urllib.error
import urllib.request
from collections.abc import Callable
from typing import Any

TIMEOUT = 30.0
USER_AGENT = "aepp-max-smoke"

PROGRAM = """ΠΡΟΓΡΑΜΜΑ Δοκιμή
ΜΕΤΑΒΛΗΤΕΣ
  ΑΚΕΡΑΙΕΣ: α, β
ΑΡΧΗ
  ΔΙΑΒΑΣΕ α, β
  ΓΡΑΨΕ α + β
ΤΕΛΟΣ_ΠΡΟΓΡΑΜΜΑΤΟΣ
"""
ALGORITHM = "Αλγόριθμος Δοκιμή\nx ← 2\nΕμφάνισε x * 3\nΤέλος Δοκιμή\n"
BROKEN = PROGRAM.replace("ΓΡΑΨΕ α + β", "α = 1")  # line 6: `=` instead of `<-`

failures: list[str] = []


class Response:
    def __init__(self, status: int, headers: dict[str, str], body: bytes) -> None:
        self.status = status
        self.headers = headers
        self.body = body

    def json(self) -> Any:
        return json.loads(self.body)

    @property
    def text(self) -> str:
        return self.body.decode("utf-8", "replace")


def request(
    method: str,
    url: str,
    body: Any = None,
    headers: dict[str, str] | None = None,
    timeout: float = TIMEOUT,
) -> Response:
    data = None if body is None else json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header("User-Agent", USER_AGENT)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    for key, value in (headers or {}).items():
        req.add_header(key, value)
    try:
        with urllib.request.urlopen(req, timeout=timeout) as res:
            return Response(res.status, {k.lower(): v for k, v in res.headers.items()}, res.read())
    except urllib.error.HTTPError as err:  # a 4xx/5xx is an answer, not a failure to connect
        return Response(err.code, {k.lower(): v for k, v in err.headers.items()}, err.read())


def check(name: str, test: Callable[[], str | None]) -> None:
    """Run one check: it returns None when it passes, or what went wrong."""
    started = time.monotonic()
    try:
        problem = test()
    except Exception as exc:  # noqa: BLE001 - a crash in a check is that check's failure
        problem = f"{type(exc).__name__}: {exc}"
    ms = (time.monotonic() - started) * 1000
    if problem is None:
        print(f"  ok    {name} ({ms:.0f} ms)")
    else:
        print(f"  FAIL  {name}: {problem}")
        failures.append(name)


def expect(res: Response, status: int) -> str | None:
    if res.status != status:
        return f"HTTP {res.status} (expected {status}): {res.text[:200]}"
    return None


def wait_for_api(api: str, wait: float) -> bool:
    """Poll /health until it answers 200: a sleeping Render instance or a starting container."""
    deadline = time.monotonic() + wait
    while True:
        try:
            if request("GET", f"{api}/health", timeout=10).status == 200:
                return True
        except OSError:
            pass
        if time.monotonic() >= deadline:
            return False
        time.sleep(1)


def api_checks(api: str, origin: str | None) -> None:
    def health() -> str | None:
        res = request("GET", f"{api}/health")
        return expect(res, 200) or (None if res.json() == {"status": "ok"} else res.text)

    def run_program() -> str | None:
        res = request("POST", f"{api}/run", {"code": PROGRAM, "inputs": ["2", "3"]})
        if problem := expect(res, 200):
            return problem
        out = res.json()
        if (out["status"], out["output"]) != ("ok", ["5"]):
            return f"status {out['status']}, output {out['output']}, error {out.get('error')}"
        return None

    def needs_input() -> str | None:
        res = request("POST", f"{api}/run", {"code": PROGRAM, "inputs": ["2"]})
        if problem := expect(res, 200):
            return problem
        out = res.json()
        if out["status"] != "needs_input" or out.get("input_line") != 5:
            return f"status {out['status']}, input_line {out.get('input_line')}"
        return None

    def traced() -> str | None:
        res = request("POST", f"{api}/run", {"code": PROGRAM, "inputs": ["2", "3"], "trace": True})
        if problem := expect(res, 200):
            return problem
        trace = res.json().get("trace") or []
        return None if trace else "no trace steps"

    def autofill() -> str | None:
        res = request("POST", f"{api}/run", {"code": PROGRAM, "autofill": True})
        if problem := expect(res, 200):
            return problem
        out = res.json()
        if out["status"] != "ok" or len(out.get("auto_inputs") or []) != 2:
            return f"status {out['status']}, auto_inputs {out.get('auto_inputs')}"
        return None

    def pseudocode() -> str | None:
        res = request("POST", f"{api}/run", {"code": ALGORITHM, "language": "pseudocode"})
        if problem := expect(res, 200):
            return problem
        out = res.json()
        if (out["status"], out["output"]) != ("ok", ["6"]):
            return f"status {out['status']}, output {out['output']}, error {out.get('error')}"
        return None

    def check_valid() -> str | None:
        res = request("POST", f"{api}/check", {"code": PROGRAM})
        return expect(res, 200) or (None if res.json()["error"] is None else res.text)

    def check_error() -> str | None:
        res = request("POST", f"{api}/check", {"code": BROKEN})
        if problem := expect(res, 200):
            return problem
        error = res.json()["error"]
        if not error or error["line"] != 6 or "<-" not in error["message"]:
            return f"expected an error on line 6 about <-, got {error}"
        return None

    def bad_request() -> str | None:
        return expect(request("POST", f"{api}/run", {"inputs": []}), 422)

    def needs_auth(method: str, path: str, body: Any = None) -> Callable[[], str | None]:
        return lambda: expect(request(method, f"{api}{path}", body), 401)

    def cors() -> str | None:
        assert origin is not None
        res = request(
            "OPTIONS",
            f"{api}/run",
            headers={
                "Origin": origin,
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type,authorization",
            },
        )
        allowed = res.headers.get("access-control-allow-origin")
        if res.status != 200 or allowed not in (origin, "*"):
            return f"HTTP {res.status}, allow-origin {allowed!r}: is {origin} in CORS_ORIGINS?"
        return None

    print(f"API {api}")
    check("GET /health", health)
    check("POST /run: ΓΛΩΣΣΑ with ΔΙΑΒΑΣΕ", run_program)
    check("POST /run: needs_input when values run out", needs_input)
    check("POST /run: πίνακας τιμών (trace)", traced)
    check("POST /run: Αυτόματες τιμές (autofill)", autofill)
    check("POST /run: ψευδογλώσσα", pseudocode)
    check("POST /check: valid program", check_valid)
    check("POST /check: error in Greek with its line", check_error)
    check("POST /run: malformed body is 422", bad_request)
    check("GET /programs needs sign-in", needs_auth("GET", "/programs"))
    check("GET /billing needs sign-in", needs_auth("GET", "/billing"))
    check("GET /agent/usage needs sign-in", needs_auth("GET", "/agent/usage"))
    check("POST /agent/chat needs sign-in", needs_auth("POST", "/agent/chat", {"message": "x"}))
    check("DELETE /account needs sign-in", needs_auth("DELETE", "/account"))
    if origin:
        check(f"CORS allows {origin}", cors)


def web_checks(web: str) -> None:
    def page(path: str, needle: str) -> Callable[[], str | None]:
        def test() -> str | None:
            res = request("GET", f"{web}{path}")
            if problem := expect(res, 200):
                return problem
            return None if needle in res.text else f"{needle!r} not in the page"

        return test

    def manifest() -> str | None:
        res = request("GET", f"{web}/manifest.webmanifest")
        if problem := expect(res, 200):
            return problem
        return None if res.json().get("start_url") else "no start_url"

    print(f"Web {web}")
    check("GET / (landing)", page("/", "Άνοιγμα editor"))
    check("GET /en (English landing)", page("/en", "Open the editor"))
    check("GET /editor (IDE)", page("/editor", "Οθόνη εκτέλεσης"))
    check("GET /login", page("/login", "Σύνδεση · AEPP Max"))
    check("GET /privacy", page("/privacy", "Πολιτική απορρήτου"))
    check("GET /manifest.webmanifest (PWA)", manifest)


def main() -> int:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--api", help="the backend's base URL, e.g. http://localhost:8000")
    parser.add_argument("--web", help="the frontend's base URL, e.g. http://localhost:3000")
    parser.add_argument(
        "--origin",
        help="check that the API's CORS allows this origin (default: --web's origin)",
    )
    parser.add_argument(
        "--wait", type=float, default=90, help="seconds to wait for the API to wake (default 90)"
    )
    args = parser.parse_args()
    if not args.api and not args.web:
        parser.error("give --api, --web or both")

    if args.api:
        api = args.api.rstrip("/")
        if not api.endswith("/api/v1"):
            api += "/api/v1"
        print(f"Waiting for {api}/health (up to {args.wait:.0f} s)…")
        if not wait_for_api(api, args.wait):
            print(f"  FAIL  the API didn't answer /health within {args.wait:.0f} s")
            return 1
        api_checks(api, args.origin or (args.web.rstrip("/") if args.web else None))
    if args.web:
        web_checks(args.web.rstrip("/"))

    if failures:
        print(f"\n{len(failures)} check(s) failed: {', '.join(failures)}")
        return 1
    print("\nAll checks passed.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
