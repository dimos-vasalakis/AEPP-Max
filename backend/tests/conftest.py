import os
import uuid
from collections.abc import Iterator

import jwt
import pytest
from fastapi.testclient import TestClient

TEST_JWT_SECRET = "test-secret-at-least-32-bytes-long!!"

# Must be set before app settings are first read. Real env vars beat backend/.env,
# so tests never touch a real database or the OpenAI API.
os.environ["SUPABASE_JWT_SECRET"] = TEST_JWT_SECRET
os.environ["DATABASE_URL"] = ""
os.environ["OPENAI_API_KEY"] = ""
os.environ["SUPABASE_SECRET_KEY"] = ""
os.environ["SENTRY_DSN"] = ""

from app.main import app  # noqa: E402


@pytest.fixture(scope="session")
def client() -> Iterator[TestClient]:
    with TestClient(app) as c:
        yield c


def auth_header(user_id: uuid.UUID | None = None) -> dict[str, str]:
    payload = {
        "sub": str(user_id or uuid.uuid4()),
        "aud": "authenticated",
        "email": "student@test.local",
    }
    return {"Authorization": f"Bearer {jwt.encode(payload, TEST_JWT_SECRET, algorithm='HS256')}"}
