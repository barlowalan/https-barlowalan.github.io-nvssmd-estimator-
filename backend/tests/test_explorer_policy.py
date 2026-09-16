"""SEP Explorer free-tier policy tests."""
import os
import pytest
from httpx import AsyncClient, ASGITransport

# Ensure env before importing app
os.environ.setdefault("MONGO_URL", "mongodb://localhost:27017")
os.environ.setdefault("DB_NAME", "sep_explorer_test")

from server import app, db, ExplorerPolicy  # noqa: E402


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture(autouse=True)
async def clean_db():
    await db.projects.delete_many({})
    await db.equipment.delete_many({})
    await db.estimate_items.delete_many({})
    await db.settings.delete_many({})
    yield
    await db.projects.delete_many({})
    await db.equipment.delete_many({})
    await db.estimate_items.delete_many({})
    await db.settings.delete_many({})


@pytest.mark.asyncio
async def test_explorer_policy_endpoint(client):
    res = await client.get("/api/explorer/policy")
    assert res.status_code == 200
    data = res.json()
    assert data["tier"] == "Explorer"
    assert data["price"] == "Free"
    assert data["active_project_limit"] == 10
    assert data["catalog_record_limit"] == 50
    assert data["labor_record_limit"] == 20
    assert data["includes_drawing"] is False
    assert data["includes_project_management"] is False
    assert data["includes_finance"] is False


@pytest.mark.asyncio
async def test_project_limit_enforced(client):
    payload = {
        "name": "P",
        "customer": "C",
        "site": "S",
        "project_type": "Commercial",
        "counts": {},
    }
    for i in range(ExplorerPolicy.active_project_limit):
        r = await client.post("/api/projects", json={**payload, "name": f"P{i}"})
        assert r.status_code == 200, r.text
    blocked = await client.post("/api/projects", json={**payload, "name": "overflow"})
    assert blocked.status_code == 403
    assert "Explorer free tier" in blocked.text


@pytest.mark.asyncio
async def test_catalog_limit_enforced(client):
    for i in range(ExplorerPolicy.catalog_record_limit):
        r = await client.post(
            "/api/equipment",
            json={
                "manufacturer": "Acme",
                "model": f"M{i}",
                "category": "CCTV",
                "cost": 10,
            },
        )
        assert r.status_code == 200, r.text
    blocked = await client.post(
        "/api/equipment",
        json={"manufacturer": "Acme", "model": "overflow", "category": "CCTV", "cost": 1},
    )
    assert blocked.status_code == 403
    assert "catalog" in blocked.text.lower()
