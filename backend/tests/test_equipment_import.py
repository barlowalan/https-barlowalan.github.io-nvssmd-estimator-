"""Phase 3: Equipment CSV Import endpoint tests.

Covers:
- Import the Axis_Product_List.csv (26 rows, manufacturer/category/part_number/msrp/cost/sell_price)
- Empty body returns created=0 with errors
- Missing required columns returns skipped rows + errors
- System -> Category mapping
- Regression: POST /api/equipment still works
"""
import os
import pytest
import requests

BASE_URL = os.environ.get("EXPO_PUBLIC_BACKEND_URL") or os.environ.get("EXPO_BACKEND_URL")
assert BASE_URL, "EXPO_PUBLIC_BACKEND_URL must be set"
BASE_URL = BASE_URL.rstrip("/")

CSV_URL = "https://customer-assets.emergentagent.com/job_app-uploader-11/artifacts/5oqribb6_Axis_Product_List.csv"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


@pytest.fixture(scope="module")
def axis_csv_text():
    r = requests.get(CSV_URL, timeout=30)
    r.raise_for_status()
    return r.text


@pytest.fixture(scope="module")
def cleanup_imports(session):
    """Remove TEST imports + Axis rows we add after the module finishes."""
    created_ids = []
    yield created_ids
    # Best-effort cleanup: delete Axis Communications rows created here.
    try:
        listing = session.get(f"{BASE_URL}/api/equipment").json()
        for it in listing:
            if it.get("manufacturer") == "Axis Communications" or (
                it.get("part_number", "").startswith("TEST_")
            ):
                session.delete(f"{BASE_URL}/api/equipment/{it['id']}")
    except Exception:
        pass


# ---------- Import: Axis CSV ----------
class TestAxisImport:
    def test_import_axis_csv_creates_26(self, session, axis_csv_text, cleanup_imports):
        resp = session.post(
            f"{BASE_URL}/api/equipment/import",
            json={"csv_text": axis_csv_text, "filename": "Axis_Product_List.csv"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["filename"] == "Axis_Product_List.csv"
        assert body["created"] == 26, f"expected 26 created, got {body}"
        assert body["skipped"] == 0, f"expected 0 skipped, got {body}"
        assert body["errors"] == []

    def test_axis_rows_have_correct_fields(self, session):
        # Note: actual CSV has 14 CCTV + 12 Access Control = 26 rows.
        # The review request said "all CCTV" but real data is mixed; backend
        # correctly maps based on the System column.
        resp = session.get(f"{BASE_URL}/api/equipment")
        assert resp.status_code == 200
        items = resp.json()
        axis = [i for i in items if i.get("manufacturer") == "Axis Communications"]
        assert len(axis) >= 26, f"expected >=26 Axis rows, got {len(axis)}"
        cctv = [r for r in axis if r["category"] == "CCTV"]
        ac = [r for r in axis if r["category"] == "Access Control"]
        assert len(cctv) >= 14, f"expected >=14 CCTV Axis rows, got {len(cctv)}"
        assert len(ac) >= 12, f"expected >=12 Access Control Axis rows, got {len(ac)}"
        for row in axis[:26]:
            assert row["manufacturer"] == "Axis Communications"
            assert row["category"] in ("CCTV", "Access Control")
            assert row.get("part_number"), f"missing part_number in {row}"
            assert row.get("msrp", 0) > 0, f"msrp not >0 in {row}"
            assert row.get("cost", 0) > 0, f"cost not >0 in {row}"
            assert row.get("sell_price", 0) > 0, f"sell_price not >0 in {row}"


# ---------- Import: Edge Cases ----------
class TestImportEdgeCases:
    def test_empty_body_returns_zero_created(self, session):
        resp = session.post(
            f"{BASE_URL}/api/equipment/import",
            json={"csv_text": "", "filename": "empty.csv"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["created"] == 0
        assert len(body["errors"]) >= 1

    def test_missing_required_columns_skips_rows(self, session):
        csv_text = "Manufacturer\nAcme\nWidgets Inc\n"
        resp = session.post(
            f"{BASE_URL}/api/equipment/import",
            json={"csv_text": csv_text, "filename": "TEST_missing.csv"},
        )
        assert resp.status_code == 200
        body = resp.json()
        assert body["created"] == 0
        assert body["skipped"] == 2
        assert len(body["errors"]) >= 1
        assert any("missing" in e.lower() for e in body["errors"])


# ---------- System -> Category mapping ----------
class TestCategoryMapping:
    @pytest.mark.parametrize(
        "system,expected_category",
        [
            ("Access Control", "Access Control"),
            ("IDS", "IDS"),
            ("Intercom", "Intercom"),
            ("Network", "Network/Headend"),
            ("Cabling", "Cabling"),
        ],
    )
    def test_system_maps_to_category(self, session, system, expected_category):
        pn = f"TEST_MAP_{system.replace(' ', '_')}"
        csv_text = (
            "Manufacturer,Part Number,Description,System,MSRP,Dealer Cost,Proposal Sell Price\n"
            f"TestVendor,{pn},Sample Device,{system},100,60,80\n"
        )
        resp = session.post(
            f"{BASE_URL}/api/equipment/import",
            json={"csv_text": csv_text, "filename": f"TEST_{system}.csv"},
        )
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["created"] == 1, body

        # Verify by GET
        listing = session.get(
            f"{BASE_URL}/api/equipment", params={"category": expected_category}
        ).json()
        match = [i for i in listing if i.get("part_number") == pn]
        assert match, f"row not found in category {expected_category}: {body}"
        assert match[0]["category"] == expected_category
        assert match[0]["manufacturer"] == "TestVendor"
        assert match[0]["msrp"] == 100.0
        assert match[0]["cost"] == 60.0
        assert match[0]["sell_price"] == 80.0

        # cleanup
        session.delete(f"{BASE_URL}/api/equipment/{match[0]['id']}")


# ---------- Regression: create endpoint still works ----------
class TestEquipmentCreateRegression:
    def test_create_equipment_with_new_fields(self, session):
        payload = {
            "manufacturer": "TEST_RegMfg",
            "model": "TEST_Model_X",
            "category": "CCTV",
            "cost": 123.45,
            "ndaa": True,
            "lead_time_days": 14,
            "warranty_years": 3,
            "part_number": "TEST_PN_001",
            "msrp": 200.0,
            "sell_price": 175.0,
        }
        resp = session.post(f"{BASE_URL}/api/equipment", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        assert body["id"]
        eq_id = body["id"]
        for k, v in payload.items():
            assert body[k] == v, f"field {k}: expected {v}, got {body[k]}"

        # GET to verify persistence
        listing = session.get(f"{BASE_URL}/api/equipment").json()
        match = [i for i in listing if i["id"] == eq_id]
        assert match, "created equipment not in list"
        assert match[0]["part_number"] == "TEST_PN_001"
        assert match[0]["msrp"] == 200.0

        # cleanup
        session.delete(f"{BASE_URL}/api/equipment/{eq_id}")

    def test_create_equipment_minimal_legacy_payload(self, session):
        """Old payloads without new fields should still work."""
        payload = {
            "manufacturer": "TEST_Legacy",
            "model": "TEST_Legacy_M",
            "category": "Cabling",
            "cost": 10.0,
        }
        resp = session.post(f"{BASE_URL}/api/equipment", json=payload)
        assert resp.status_code == 200, resp.text
        body = resp.json()
        # New fields should have defaults
        assert body["part_number"] == ""
        assert body["msrp"] == 0.0
        assert body["sell_price"] == 0.0
        session.delete(f"{BASE_URL}/api/equipment/{body['id']}")
