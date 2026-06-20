"""NVSSMD Estimator backend regression tests."""
import os
import pytest
import requests

BASE = os.environ.get("EXPO_PUBLIC_BACKEND_URL", "https://app-uploader-11.preview.emergentagent.com").rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="session")
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# ------- root / health -------
def test_root(s):
    r = s.get(f"{API}/")
    assert r.status_code == 200
    assert "NVSSMD" in r.json().get("message", "")


# ------- Projects CRUD -------
@pytest.fixture(scope="module")
def project_id():
    sess = requests.Session()
    payload = {
        "name": "TEST_Project_AlphaSite",
        "customer": "TEST_Customer",
        "site": "Bldg 1",
        "project_type": "Federal",
        "scope_notes": "test",
        "overhead_pct": 10.0,
        "profit_pct": 12.0,
        "contingency_pct": 5.0,
        "counts": {"cameras": 12, "doors": 6, "ids_points": 4, "intercoms": 2, "cable_runs": 20},
    }
    r = sess.post(f"{API}/projects", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    yield pid
    sess.delete(f"{API}/projects/{pid}")


def test_project_create_persists(s, project_id):
    r = s.get(f"{API}/projects/{project_id}")
    assert r.status_code == 200
    body = r.json()
    assert body["name"] == "TEST_Project_AlphaSite"
    assert body["project_type"] == "Federal"
    assert body["counts"]["cameras"] == 12
    assert body["counts"]["cable_runs"] == 20


def test_list_projects(s, project_id):
    r = s.get(f"{API}/projects")
    assert r.status_code == 200
    assert any(p["id"] == project_id for p in r.json())


def test_project_404(s):
    r = s.get(f"{API}/projects/does-not-exist")
    assert r.status_code == 404


# ------- Equipment -------
@pytest.fixture(scope="module")
def eq_id():
    sess = requests.Session()
    r = sess.post(f"{API}/equipment", json={
        "manufacturer": "TEST_Axis",
        "model": "P3265",
        "category": "CCTV",
        "cost": 850.0,
        "ndaa": True,
        "lead_time_days": 14,
        "warranty_years": 3,
    })
    assert r.status_code == 200, r.text
    eid = r.json()["id"]
    yield eid
    sess.delete(f"{API}/equipment/{eid}")


def test_equipment_persist_and_filter(s, eq_id):
    r = s.get(f"{API}/equipment")
    assert r.status_code == 200
    ids = [e["id"] for e in r.json()]
    assert eq_id in ids

    r2 = s.get(f"{API}/equipment", params={"category": "CCTV"})
    assert r2.status_code == 200
    assert all(e["category"] == "CCTV" for e in r2.json())
    assert eq_id in [e["id"] for e in r2.json()]

    r3 = s.get(f"{API}/equipment", params={"category": "Intercom"})
    assert r3.status_code == 200
    assert eq_id not in [e["id"] for e in r3.json()]


def test_equipment_ndaa_flag(s, eq_id):
    r = s.get(f"{API}/equipment")
    eq = next(e for e in r.json() if e["id"] == eq_id)
    assert eq["ndaa"] is True
    assert eq["lead_time_days"] == 14
    assert eq["warranty_years"] == 3


def test_equipment_delete():
    sess = requests.Session()
    r = sess.post(f"{API}/equipment", json={
        "manufacturer": "TEST_DelMe", "model": "X", "category": "IDS",
        "cost": 1.0, "ndaa": False, "lead_time_days": 0, "warranty_years": 1,
    })
    eid = r.json()["id"]
    d = sess.delete(f"{API}/equipment/{eid}")
    assert d.status_code == 200
    g = sess.get(f"{API}/equipment")
    assert eid not in [e["id"] for e in g.json()]


# ------- Labor rates -------
def test_labor_rates_defaults_and_upsert(s):
    r = s.get(f"{API}/labor-rates")
    assert r.status_code == 200
    body = r.json()
    for k in ("technician", "lead_technician", "engineer", "project_manager", "closeout"):
        assert k in body and isinstance(body[k], (int, float))

    new = {"technician": 80.0, "lead_technician": 100.0, "engineer": 135.0,
           "project_manager": 145.0, "closeout": 90.0}
    p = s.put(f"{API}/labor-rates", json=new)
    assert p.status_code == 200
    r2 = s.get(f"{API}/labor-rates")
    assert r2.json() == new

    # restore defaults
    s.put(f"{API}/labor-rates", json={"technician": 75.0, "lead_technician": 95.0,
                                       "engineer": 130.0, "project_manager": 140.0, "closeout": 85.0})


# ------- Items + Estimate -------
def test_items_crud_and_estimate(s, project_id):
    # ensure known rates
    rates = {"technician": 75.0, "lead_technician": 95.0, "engineer": 130.0,
             "project_manager": 140.0, "closeout": 85.0}
    s.put(f"{API}/labor-rates", json=rates)

    # add 2 items
    i1 = s.post(f"{API}/projects/{project_id}/items", json={
        "description": "TEST_Camera", "quantity": 10, "unit_cost": 500,
        "labor_hours": 4, "labor_role": "technician",
    })
    assert i1.status_code == 200, i1.text
    i1_id = i1.json()["id"]

    i2 = s.post(f"{API}/projects/{project_id}/items", json={
        "description": "TEST_Reader", "quantity": 6, "unit_cost": 250,
        "labor_hours": 2, "labor_role": "engineer",
    })
    assert i2.status_code == 200
    i2_id = i2.json()["id"]

    items = s.get(f"{API}/projects/{project_id}/items").json()
    assert {i1_id, i2_id}.issubset({i["id"] for i in items})

    est = s.get(f"{API}/projects/{project_id}/estimate")
    assert est.status_code == 200
    e = est.json()
    expected_material = 10 * 500 + 6 * 250  # 6500
    expected_labor = 4 * 75 + 2 * 130        # 560
    expected_sub = expected_material + expected_labor  # 7060
    expected_oh = expected_sub * 0.10
    expected_pf = expected_sub * 0.12
    expected_ct = expected_sub * 0.05
    expected_total = expected_sub + expected_oh + expected_pf + expected_ct

    assert abs(e["material_cost"] - expected_material) < 0.01
    assert abs(e["labor_cost"] - expected_labor) < 0.01
    assert abs(e["subtotal"] - expected_sub) < 0.01
    assert abs(e["overhead"] - expected_oh) < 0.01
    assert abs(e["profit"] - expected_pf) < 0.01
    assert abs(e["contingency"] - expected_ct) < 0.01
    assert abs(e["total"] - expected_total) < 0.01
    assert e["item_count"] == 2

    # delete one item
    d = s.delete(f"{API}/projects/{project_id}/items/{i1_id}")
    assert d.status_code == 200
    items2 = s.get(f"{API}/projects/{project_id}/items").json()
    assert i1_id not in [i["id"] for i in items2]


def test_add_item_to_missing_project(s):
    r = s.post(f"{API}/projects/nope/items", json={
        "description": "x", "quantity": 1, "unit_cost": 1, "labor_hours": 0, "labor_role": "technician"})
    assert r.status_code == 404


def test_delete_project_cascades_items():
    sess = requests.Session()
    p = sess.post(f"{API}/projects", json={"name": "TEST_Cascade"}).json()
    pid = p["id"]
    sess.post(f"{API}/projects/{pid}/items", json={
        "description": "x", "quantity": 1, "unit_cost": 1, "labor_hours": 0, "labor_role": "technician"})
    items = sess.get(f"{API}/projects/{pid}/items").json()
    assert len(items) == 1
    d = sess.delete(f"{API}/projects/{pid}")
    assert d.status_code == 200
    g = sess.get(f"{API}/projects/{pid}")
    assert g.status_code == 404
    # ensure items removed (can't query by pid since project gone, but estimate should 404)
    e = sess.get(f"{API}/projects/{pid}/estimate")
    assert e.status_code == 404
