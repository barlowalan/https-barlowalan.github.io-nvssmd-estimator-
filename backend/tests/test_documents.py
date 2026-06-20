"""Phase 2 - Documents (Scope/Proposal/BOE) backend tests."""
import os
import pytest
import requests

BASE = os.environ["EXPO_PUBLIC_BACKEND_URL"].rstrip("/")
API = f"{BASE}/api"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def project(session):
    payload = {
        "name": "TEST_Docs_Project",
        "customer": "TEST_Acme Corp",
        "site": "HQ Bldg A",
        "project_type": "Commercial",
        "scope_notes": "",
        "overhead_pct": 10.0,
        "profit_pct": 12.0,
        "contingency_pct": 5.0,
        "counts": {"cameras": 15, "doors": 8, "ids_points": 5, "intercoms": 3, "cable_runs": 25},
    }
    r = session.post(f"{API}/projects", json=payload)
    assert r.status_code == 200, r.text
    pid = r.json()["id"]
    # add a couple of estimate items so price_summary has real numbers
    session.post(f"{API}/projects/{pid}/items", json={
        "description": "TEST Camera install", "quantity": 10, "unit_cost": 450.0,
        "labor_hours": 20, "labor_role": "technician"
    })
    session.post(f"{API}/projects/{pid}/items", json={
        "description": "TEST Headend engineering", "quantity": 1, "unit_cost": 1200.0,
        "labor_hours": 8, "labor_role": "engineer"
    })
    yield pid
    session.delete(f"{API}/projects/{pid}")


# -------- GET defaults ----------
def test_get_documents_returns_empty_defaults(session, project):
    r = session.get(f"{API}/projects/{project}/documents")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["project_id"] == project
    # All sub-section fields exist and default empty
    for k in ["overview", "inclusions", "exclusions", "testing", "training", "warranty"]:
        assert body["scope"][k] == ""
    for k in ["executive_summary", "technical_approach", "price_summary", "assumptions", "exclusions", "acceptance"]:
        assert body["proposal"][k] == ""
    for k in ["basis_of_labor", "basis_of_material", "risk_factors", "schedule_assumptions", "clarifications"]:
        assert body["boe"][k] == ""


# -------- PUT persists ----------
def test_put_documents_persists_and_sets_updated_at(session, project):
    payload = {
        "project_id": project,
        "scope": {"overview": "TEST manually authored overview", "inclusions": "", "exclusions": "",
                  "testing": "", "training": "", "warranty": ""},
        "proposal": {"executive_summary": "", "technical_approach": "", "price_summary": "",
                     "assumptions": "", "exclusions": "", "acceptance": ""},
        "boe": {"basis_of_labor": "", "basis_of_material": "", "risk_factors": "",
                "schedule_assumptions": "", "clarifications": ""},
        "updated_at": "",
    }
    r = session.put(f"{API}/projects/{project}/documents", json=payload)
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["updated_at"] != ""
    assert body["scope"]["overview"] == "TEST manually authored overview"

    # verify persistence via GET
    g = session.get(f"{API}/projects/{project}/documents").json()
    assert g["scope"]["overview"] == "TEST manually authored overview"
    assert g["updated_at"] == body["updated_at"]


# -------- POST generate single section does not clobber others ----------
def test_generate_scope_does_not_clobber_other_sections(session, project):
    # Pre-set proposal text manually
    cur = session.get(f"{API}/projects/{project}/documents").json()
    cur["proposal"]["executive_summary"] = "TEST_preserve_me"
    session.put(f"{API}/projects/{project}/documents", json=cur)

    r = session.post(f"{API}/projects/{project}/documents/generate?section=scope")
    assert r.status_code == 200, r.text
    body = r.json()
    # scope should now have content
    assert "TEST_Acme Corp" in body["scope"]["overview"]
    assert "15 CCTV cameras" in body["scope"]["overview"]
    assert body["scope"]["inclusions"].startswith("• ")
    # proposal should NOT be clobbered
    assert body["proposal"]["executive_summary"] == "TEST_preserve_me"


# -------- POST generate all ----------
def test_generate_all_sections(session, project):
    r = session.post(f"{API}/projects/{project}/documents/generate?section=all")
    assert r.status_code == 200, r.text
    body = r.json()
    assert body["scope"]["overview"]
    assert body["scope"]["warranty"]
    assert body["proposal"]["executive_summary"]
    assert body["proposal"]["price_summary"]
    assert body["proposal"]["acceptance"]
    assert body["boe"]["basis_of_labor"]
    assert body["boe"]["basis_of_material"]
    assert body["boe"]["risk_factors"]
    assert body["updated_at"] != ""


# -------- Generated proposal price_summary reflects estimate ----------
def test_proposal_price_summary_matches_estimate(session, project):
    est = session.get(f"{API}/projects/{project}/estimate").json()
    gen = session.post(f"{API}/projects/{project}/documents/generate?section=proposal").json()
    ps = gen["proposal"]["price_summary"]
    # numbers formatted with thousands separator + 2 decimals
    assert f"${est['material_cost']:,.2f}" in ps
    assert f"${est['labor_cost']:,.2f}" in ps
    assert f"${est['total']:,.2f}" in ps
    # executive_summary also references the total
    assert f"${est['total']:,.2f}" in gen["proposal"]["executive_summary"]


# -------- 404 on missing project ----------
def test_404_on_missing_project_get(session):
    r = session.get(f"{API}/projects/does-not-exist-xyz/documents")
    assert r.status_code == 404


def test_404_on_missing_project_put(session):
    payload = {
        "project_id": "nope",
        "scope": {"overview": "", "inclusions": "", "exclusions": "", "testing": "", "training": "", "warranty": ""},
        "proposal": {"executive_summary": "", "technical_approach": "", "price_summary": "",
                     "assumptions": "", "exclusions": "", "acceptance": ""},
        "boe": {"basis_of_labor": "", "basis_of_material": "", "risk_factors": "",
                "schedule_assumptions": "", "clarifications": ""},
        "updated_at": "",
    }
    r = session.put(f"{API}/projects/does-not-exist-xyz/documents", json=payload)
    assert r.status_code == 404


def test_404_on_missing_project_generate(session):
    r = session.post(f"{API}/projects/does-not-exist-xyz/documents/generate?section=all")
    assert r.status_code == 404
