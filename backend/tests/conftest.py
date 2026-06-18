import os

import pytest
from fastapi.testclient import TestClient

os.environ["DATABASE_URL"] = "sqlite+pysqlite:///:memory:"
os.environ["LLM_ENABLED"] = "false"
os.environ["RATE_LIMIT_REQUESTS"] = "10000"

from app.db.database import Base, engine  # noqa: E402
from app.main import app  # noqa: E402


@pytest.fixture(autouse=True)
def reset_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client() -> TestClient:
    return TestClient(app)
