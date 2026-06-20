from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ===================== Models =====================
class SystemCounts(BaseModel):
    cameras: int = 0
    doors: int = 0
    ids_points: int = 0
    intercoms: int = 0
    cable_runs: int = 0


class ProjectCreate(BaseModel):
    name: str
    customer: str = ""
    site: str = ""
    project_type: str = "Commercial"  # Commercial | Federal | Union
    bid_due: Optional[str] = None
    scope_notes: str = ""
    overhead_pct: float = 10.0
    profit_pct: float = 12.0
    contingency_pct: float = 5.0
    counts: SystemCounts = Field(default_factory=SystemCounts)


class Project(ProjectCreate):
    id: str
    created_at: str


class EquipmentCreate(BaseModel):
    manufacturer: str
    model: str
    category: str  # CCTV | Access Control | IDS | Intercom | Cabling | Network/Headend
    cost: float
    ndaa: bool = False
    lead_time_days: int = 0
    warranty_years: int = 1
    part_number: str = ""
    msrp: float = 0.0
    sell_price: float = 0.0


class Equipment(EquipmentCreate):
    id: str


class ImportRow(BaseModel):
    csv_text: str
    filename: Optional[str] = None
    manufacturer_default: Optional[str] = None


class ImportFile(BaseModel):
    file_b64: str
    filename: str
    manufacturer_default: Optional[str] = None


class ImportResult(BaseModel):
    filename: str
    created: int
    skipped: int
    errors: List[str]


class LaborRates(BaseModel):
    technician: float = 75.0
    lead_technician: float = 95.0
    engineer: float = 130.0
    project_manager: float = 140.0
    closeout: float = 85.0


class EstimateItemCreate(BaseModel):
    description: str
    equipment_id: Optional[str] = None
    quantity: float = 1
    unit_cost: float = 0
    labor_hours: float = 0
    labor_role: str = "technician"  # matches LaborRates field


class EstimateItem(EstimateItemCreate):
    id: str
    project_id: str


class EstimateSummary(BaseModel):
    material_cost: float
    labor_cost: float
    subtotal: float
    overhead: float
    profit: float
    contingency: float
    total: float
    item_count: int


# Documents (Phase 2)
class ScopeDoc(BaseModel):
    overview: str = ""
    inclusions: str = ""
    exclusions: str = ""
    testing: str = ""
    training: str = ""
    warranty: str = ""


class ProposalDoc(BaseModel):
    executive_summary: str = ""
    technical_approach: str = ""
    price_summary: str = ""
    assumptions: str = ""
    exclusions: str = ""
    acceptance: str = ""


class BoeDoc(BaseModel):
    basis_of_labor: str = ""
    basis_of_material: str = ""
    risk_factors: str = ""
    schedule_assumptions: str = ""
    clarifications: str = ""


class ProjectDocuments(BaseModel):
    project_id: str
    scope: ScopeDoc = Field(default_factory=ScopeDoc)
    proposal: ProposalDoc = Field(default_factory=ProposalDoc)
    boe: BoeDoc = Field(default_factory=BoeDoc)
    updated_at: str = ""


def strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ===================== Routes: Projects =====================
@api_router.get("/")
async def root():
    return {"message": "Security Estimator Pro API"}


@api_router.get("/projects", response_model=List[Project])
async def list_projects():
    docs = await db.projects.find({}, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return [Project(**d) for d in docs]


@api_router.post("/projects", response_model=Project)
async def create_project(payload: ProjectCreate):
    project = Project(
        id=str(uuid.uuid4()),
        created_at=datetime.now(timezone.utc).isoformat(),
        **payload.dict(),
    )
    await db.projects.insert_one(project.dict())
    return project


@api_router.get("/projects/{project_id}", response_model=Project)
async def get_project(project_id: str):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    return Project(**doc)


@api_router.put("/projects/{project_id}", response_model=Project)
async def update_project(project_id: str, payload: ProjectCreate):
    doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Project not found")
    merged = {**doc, **payload.dict()}
    await db.projects.update_one({"id": project_id}, {"$set": payload.dict()})
    return Project(**merged)


@api_router.delete("/projects/{project_id}")
async def delete_project(project_id: str):
    res = await db.projects.delete_one({"id": project_id})
    await db.estimate_items.delete_many({"project_id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Project not found")
    return {"success": True}


# ===================== Routes: Equipment =====================
@api_router.get("/equipment", response_model=List[Equipment])
async def list_equipment(category: Optional[str] = None):
    query = {}
    if category and category != "all":
        query["category"] = category
    docs = await db.equipment.find(query, {"_id": 0}).sort("manufacturer", 1).to_list(1000)
    return [Equipment(**d) for d in docs]


@api_router.post("/equipment", response_model=Equipment)
async def create_equipment(payload: EquipmentCreate):
    eq = Equipment(id=str(uuid.uuid4()), **payload.dict())
    await db.equipment.insert_one(eq.dict())
    return eq


@api_router.delete("/equipment/{eq_id}")
async def delete_equipment(eq_id: str):
    res = await db.equipment.delete_one({"id": eq_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Equipment not found")
    return {"success": True}


# ---- CSV Import ----
_SYSTEM_TO_CATEGORY = {
    "cctv": "CCTV",
    "video": "CCTV",
    "camera": "CCTV",
    "surveillance": "CCTV",
    "access control": "Access Control",
    "acs": "Access Control",
    "access": "Access Control",
    "ids": "IDS",
    "intrusion": "IDS",
    "alarm": "IDS",
    "intercom": "Intercom",
    "cabling": "Cabling",
    "cable": "Cabling",
    "wire": "Cabling",
    "network": "Network/Headend",
    "headend": "Network/Headend",
    "head end": "Network/Headend",
    "head-end": "Network/Headend",
    "switch": "Network/Headend",
    "server": "Network/Headend",
}


def _map_category(value: str) -> str:
    if not value:
        return "Network/Headend"
    v = value.strip().lower()
    if v in _SYSTEM_TO_CATEGORY:
        return _SYSTEM_TO_CATEGORY[v]
    for k, mapped in _SYSTEM_TO_CATEGORY.items():
        if k in v:
            return mapped
    return value.strip()


def _norm_header(s: str) -> str:
    return "".join(ch.lower() for ch in (s or "") if ch.isalnum())


def _pick(row: dict, candidates: List[str]) -> str:
    norm_map = {_norm_header(k): k for k in row.keys()}
    for c in candidates:
        nk = _norm_header(c)
        if nk in norm_map:
            v = row.get(norm_map[nk])
            if v is not None and str(v).strip() != "":
                return str(v).strip()
    return ""


def _parse_float(s: str) -> float:
    if not s:
        return 0.0
    cleaned = s.replace("$", "").replace(",", "").replace("%", "").strip()
    try:
        return float(cleaned)
    except ValueError:
        return 0.0


def _build_doc_from_row(row: dict, manufacturer_default: Optional[str]) -> tuple[Optional[dict], Optional[str]]:
    """Map a CSV/XLSX/PDF row dict (header→value) to an Equipment doc. Returns (doc, error)."""
    manufacturer = _pick(row, ["Manufacturer", "Brand", "Vendor"]) or (manufacturer_default or "")
    part_number = _pick(row, ["Part Number", "PartNumber", "PN", "SKU", "Model Number", "ModelNumber"])
    description = _pick(row, ["Description", "Model", "Name", "Product"])
    system = _pick(row, ["System", "Category", "Type", "System Category"])

    if part_number and description:
        model = f"{part_number} — {description}"
    else:
        model = description or part_number

    if not manufacturer or not model:
        return None, "missing manufacturer or model"

    category = _map_category(system)
    msrp = _parse_float(_pick(row, ["MSRP / List Price", "MSRP/List Price", "MSRP", "List Price", "Price"]))
    cost = _parse_float(_pick(row, ["Dealer Cost", "Cost", "Net Cost", "Unit Cost"]))
    sell = _parse_float(_pick(row, ["Proposal Sell Price", "Sell Price", "Sell", "Customer Price"]))

    if cost == 0 and msrp > 0:
        disc = _parse_float(_pick(row, ["Dealer Discount %", "Discount %", "Discount"]))
        if 0 < disc <= 1:
            cost = round(msrp * (1 - disc), 2)
        elif disc > 1:
            cost = round(msrp * (1 - disc / 100.0), 2)

    ndaa_raw = _pick(row, ["NDAA", "NDAA Compliant", "Compliant"]).lower()
    ndaa = ndaa_raw in ("y", "yes", "true", "1", "compliant")

    lead = int(_parse_float(_pick(row, ["Lead Time", "Lead Days", "Lead Time Days"]) or "0"))
    warranty_raw = _parse_float(_pick(row, ["Warranty", "Warranty Years", "Warranty (yrs)"]) or "1") or 1
    warranty = int(warranty_raw)

    return {
        "id": str(uuid.uuid4()),
        "manufacturer": manufacturer,
        "model": model,
        "category": category,
        "cost": cost,
        "ndaa": ndaa,
        "lead_time_days": lead,
        "warranty_years": warranty,
        "part_number": part_number,
        "msrp": msrp,
        "sell_price": sell,
    }, None


@api_router.post("/equipment/import", response_model=ImportResult)
async def import_equipment(payload: ImportRow):
    import csv
    import io

    text = payload.csv_text.lstrip("\ufeff").strip()
    if not text:
        return ImportResult(filename=payload.filename or "upload.csv", created=0, skipped=0, errors=["empty file"])

    reader = csv.DictReader(io.StringIO(text))
    created = 0
    skipped = 0
    errors: List[str] = []
    docs_to_insert = []

    for idx, row in enumerate(reader, start=2):
        doc, err = _build_doc_from_row(row, payload.manufacturer_default)
        if err:
            skipped += 1
            errors.append(f"row {idx}: {err}")
            continue
        docs_to_insert.append(doc)
        created += 1

    if docs_to_insert:
        await db.equipment.insert_many(docs_to_insert)

    return ImportResult(
        filename=payload.filename or "upload.csv",
        created=created,
        skipped=skipped,
        errors=errors[:20],
    )


def _rows_from_xlsx(data: bytes) -> List[dict]:
    import openpyxl
    import io as _io
    wb = openpyxl.load_workbook(_io.BytesIO(data), data_only=True, read_only=True)
    out: List[dict] = []
    for ws in wb.worksheets:
        rows_iter = ws.iter_rows(values_only=True)
        header: List[str] = []
        for r in rows_iter:
            if not header:
                header = [str(c).strip() if c is not None else "" for c in r]
                # Only accept sheets that look like data tables (>=2 non-empty headers)
                if sum(1 for h in header if h) < 2:
                    header = []
                continue
            if all(c is None or str(c).strip() == "" for c in r):
                continue
            row_dict = {}
            for i, h in enumerate(header):
                if not h:
                    continue
                v = r[i] if i < len(r) else None
                row_dict[h] = "" if v is None else str(v)
            if any(v for v in row_dict.values()):
                out.append(row_dict)
    return out


def _rows_from_pdf(data: bytes) -> List[dict]:
    import pdfplumber
    import io as _io
    out: List[dict] = []
    with pdfplumber.open(_io.BytesIO(data)) as pdf:
        for page in pdf.pages:
            for table in (page.extract_tables() or []):
                if not table or len(table) < 2:
                    continue
                header = [(c or "").strip() for c in table[0]]
                if sum(1 for h in header if h) < 2:
                    continue
                for r in table[1:]:
                    if all(c is None or str(c).strip() == "" for c in r):
                        continue
                    row_dict = {}
                    for i, h in enumerate(header):
                        if not h:
                            continue
                        v = r[i] if i < len(r) else ""
                        row_dict[h] = "" if v is None else str(v)
                    if any(v for v in row_dict.values()):
                        out.append(row_dict)
    return out


def _rows_from_csv_text(text: str) -> List[dict]:
    import csv
    import io as _io
    text = text.lstrip("\ufeff").strip()
    if not text:
        return []
    reader = csv.DictReader(_io.StringIO(text))
    return [dict(r) for r in reader]


@api_router.post("/equipment/import-file", response_model=ImportResult)
async def import_equipment_file(payload: ImportFile):
    """Accepts a base64-encoded CSV, XLSX, or PDF file and imports equipment rows from it.

    For XLSX: every sheet that has a recognisable header row is parsed.
    For PDF: every detected table on every page is parsed.
    """
    import base64 as _b64

    filename = payload.filename or "upload"
    try:
        data = _b64.b64decode(payload.file_b64)
    except Exception as ex:
        return ImportResult(filename=filename, created=0, skipped=0, errors=[f"invalid base64: {ex}"])

    if not data:
        return ImportResult(filename=filename, created=0, skipped=0, errors=["empty file"])

    ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
    rows: List[dict] = []
    parse_error: Optional[str] = None
    try:
        if ext == "xlsx" or ext == "xlsm":
            rows = _rows_from_xlsx(data)
        elif ext == "pdf":
            rows = _rows_from_pdf(data)
        else:
            # default to CSV (covers .csv, .txt and unknowns)
            rows = _rows_from_csv_text(data.decode("utf-8", errors="replace"))
    except Exception as ex:
        parse_error = f"could not parse {ext or 'file'}: {ex}"

    if parse_error:
        return ImportResult(filename=filename, created=0, skipped=0, errors=[parse_error])

    created = 0
    skipped = 0
    errors: List[str] = []
    docs_to_insert: List[dict] = []
    for idx, row in enumerate(rows, start=2):
        doc, err = _build_doc_from_row(row, payload.manufacturer_default)
        if err:
            skipped += 1
            errors.append(f"row {idx}: {err}")
            continue
        docs_to_insert.append(doc)
        created += 1

    if docs_to_insert:
        await db.equipment.insert_many(docs_to_insert)

    return ImportResult(
        filename=filename,
        created=created,
        skipped=skipped,
        errors=errors[:20],
    )


# ===================== Routes: Labor Rates =====================
@api_router.get("/labor-rates", response_model=LaborRates)
async def get_labor_rates():
    doc = await db.settings.find_one({"key": "labor_rates"}, {"_id": 0})
    if not doc:
        return LaborRates()
    return LaborRates(**doc.get("value", {}))


@api_router.put("/labor-rates", response_model=LaborRates)
async def update_labor_rates(payload: LaborRates):
    await db.settings.update_one(
        {"key": "labor_rates"},
        {"$set": {"key": "labor_rates", "value": payload.dict()}},
        upsert=True,
    )
    return payload


# ===================== Routes: Estimate Items =====================
@api_router.get("/projects/{project_id}/items", response_model=List[EstimateItem])
async def list_items(project_id: str):
    docs = await db.estimate_items.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    return [EstimateItem(**d) for d in docs]


@api_router.post("/projects/{project_id}/items", response_model=EstimateItem)
async def add_item(project_id: str, payload: EstimateItemCreate):
    proj = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    item = EstimateItem(id=str(uuid.uuid4()), project_id=project_id, **payload.dict())
    await db.estimate_items.insert_one(item.dict())
    return item


@api_router.delete("/projects/{project_id}/items/{item_id}")
async def delete_item(project_id: str, item_id: str):
    res = await db.estimate_items.delete_one({"id": item_id, "project_id": project_id})
    if res.deleted_count == 0:
        raise HTTPException(404, "Item not found")
    return {"success": True}


@api_router.get("/projects/{project_id}/estimate", response_model=EstimateSummary)
async def project_estimate(project_id: str):
    proj_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj_doc:
        raise HTTPException(404, "Project not found")
    proj = Project(**proj_doc)
    rates_doc = await db.settings.find_one({"key": "labor_rates"}, {"_id": 0})
    rates = LaborRates(**(rates_doc.get("value", {}) if rates_doc else {}))

    items = await db.estimate_items.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    material = 0.0
    labor = 0.0
    for it in items:
        material += float(it["quantity"]) * float(it["unit_cost"])
        rate = getattr(rates, it.get("labor_role", "technician"), rates.technician)
        labor += float(it["labor_hours"]) * float(rate)
    subtotal = material + labor
    overhead = subtotal * (proj.overhead_pct / 100.0)
    profit = subtotal * (proj.profit_pct / 100.0)
    contingency = subtotal * (proj.contingency_pct / 100.0)
    total = subtotal + overhead + profit + contingency
    return EstimateSummary(
        material_cost=round(material, 2),
        labor_cost=round(labor, 2),
        subtotal=round(subtotal, 2),
        overhead=round(overhead, 2),
        profit=round(profit, 2),
        contingency=round(contingency, 2),
        total=round(total, 2),
        item_count=len(items),
    )


def _escape_html(s: str) -> str:
    return (
        (s or "")
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\n", "<br/>")
    )


_ROLE_LABELS = {
    "technician": "Technician",
    "lead_technician": "Lead Technician",
    "engineer": "Engineer / Programmer",
    "project_manager": "Project Manager",
    "closeout": "Closeout / O&M",
}


def _build_project_html(
    project: Project,
    est: EstimateSummary,
    items: List[dict],
    docs: Optional["ProjectDocuments"],
) -> str:
    today = datetime.now(timezone.utc).strftime("%B %d, %Y")
    c = project.counts

    def _money(n: float) -> str:
        return f"${n:,.2f}"

    item_rows = "".join(
        f"<tr>"
        f"<td>{_escape_html(it['description'])}</td>"
        f"<td class='num'>{it['quantity']}</td>"
        f"<td class='num'>${float(it['unit_cost']):.2f}</td>"
        f"<td class='num'>{it['labor_hours']}</td>"
        f"<td>{_escape_html(_ROLE_LABELS.get(it.get('labor_role','technician'), it.get('labor_role','')))}</td>"
        f"<td class='num'>${float(it['quantity']) * float(it['unit_cost']):.2f}</td>"
        f"</tr>"
        for it in items
    )

    def _doc_section(title: str, fields: List[tuple]) -> str:
        rendered = "".join(
            f"<div class='doc-field'><div class='doc-label'>{label}</div><p>{_escape_html(value)}</p></div>"
            for label, value in fields if (value or "").strip()
        )
        if not rendered:
            return ""
        return f"<h2>{title}</h2>{rendered}"

    scope = docs.scope if docs else None
    proposal = docs.proposal if docs else None
    boe = docs.boe if docs else None

    scope_html = _doc_section("Scope of Work", [
        ("Overview", scope.overview if scope else ""),
        ("Inclusions", scope.inclusions if scope else ""),
        ("Exclusions", scope.exclusions if scope else ""),
        ("Testing", scope.testing if scope else ""),
        ("Training", scope.training if scope else ""),
        ("Warranty", scope.warranty if scope else ""),
    ])
    proposal_html = _doc_section("Proposal", [
        ("Executive Summary", proposal.executive_summary if proposal else ""),
        ("Technical Approach", proposal.technical_approach if proposal else ""),
        ("Price Summary", proposal.price_summary if proposal else ""),
        ("Assumptions", proposal.assumptions if proposal else ""),
        ("Exclusions", proposal.exclusions if proposal else ""),
        ("Acceptance", proposal.acceptance if proposal else ""),
    ])
    boe_html = _doc_section("Basis of Estimate", [
        ("Basis of Labor", boe.basis_of_labor if boe else ""),
        ("Basis of Material", boe.basis_of_material if boe else ""),
        ("Risk Factors", boe.risk_factors if boe else ""),
        ("Schedule Assumptions", boe.schedule_assumptions if boe else ""),
        ("Clarifications", boe.clarifications if boe else ""),
    ])

    items_block = (
        "<p style='color:#8E8E93;font-size:11px;'>No line items recorded.</p>"
        if not items
        else (
            "<table class='items'>"
            "<thead><tr><th>Description</th><th class='num'>Qty</th><th class='num'>Unit Cost</th>"
            "<th class='num'>Hours</th><th>Role</th><th class='num'>Material</th></tr></thead>"
            f"<tbody>{item_rows}</tbody></table>"
        )
    )

    return f"""<!doctype html>
<html><head><meta charset="utf-8" /><title>{_escape_html(project.name)} — Project Estimate</title>
<style>
@page {{ size: letter; margin: 0.6in 0.55in; }}
body {{ font-family: Helvetica, Arial, sans-serif; color: #1c1c1e; font-size: 11px; }}
header {{ border-bottom: 2px solid #5B7B6D; padding-bottom: 10px; margin-bottom: 16px; }}
.brand {{ color: #5B7B6D; font-weight: bold; letter-spacing: 2px; font-size: 9px; }}
h1 {{ font-size: 22px; margin: 4px 0; }}
.meta {{ color: #6c6c70; font-size: 10px; }}
h2 {{ color: #3A5A4C; font-size: 12px; margin-top: 18px; margin-bottom: 6px;
      border-bottom: 1px solid #E5E5EA; padding-bottom: 3px; text-transform: uppercase; letter-spacing: 0.5px; }}
.summary {{ background-color: #2C2C2E; color: #F9F9F7; padding: 14px 16px; }}
.summary .lbl {{ color: #BBD1C7; font-size: 9px; letter-spacing: 1px; }}
.summary .total {{ font-size: 26px; font-weight: bold; }}
.summary table {{ width: 100%; margin-top: 8px; border-top: 1px solid #444; }}
.summary td {{ padding: 2px 0; font-size: 10px; color: #F9F9F7; }}
.summary td.num {{ text-align: right; font-weight: bold; }}
.counts {{ width: 100%; }}
.counts td {{ width: 20%; background-color: #F9F9F7;
              border: 1px solid #E5E5EA; padding: 8px; }}
.counts .lbl {{ font-size: 9px; color: #6c6c70; }}
.counts .val {{ font-size: 14px; font-weight: bold; }}
.items {{ width: 100%; border-collapse: collapse; }}
.items th, .items td {{ border-bottom: 1px solid #E5E5EA; padding: 4px 6px; font-size: 10px; text-align: left; }}
.items th {{ background-color: #F0F0EE; }}
.items td.num, .items th.num {{ text-align: right; }}
.doc-field {{ margin: 8px 0; }}
.doc-label {{ font-size: 9px; color: #5B7B6D; font-weight: bold; text-transform: uppercase; letter-spacing: 0.4px; }}
.doc-field p {{ font-size: 10.5px; margin: 3px 0 0; }}
footer {{ margin-top: 20px; padding-top: 8px; border-top: 1px solid #E5E5EA;
          color: #8E8E93; font-size: 9px; text-align: center; }}
</style></head>
<body>
<header>
  <div class="brand">SECURITY ESTIMATOR PRO</div>
  <h1>{_escape_html(project.name)}</h1>
  <div class="meta">
    {_escape_html(project.customer or '—')} &middot; {_escape_html(project.site or '—')}
    &middot; {_escape_html(project.project_type)} &middot; Generated {today}
  </div>
</header>

<h2>Estimate Summary</h2>
<div class="summary">
  <div class="lbl">ESTIMATED SELL PRICE</div>
  <div class="total">{_money(est.total)}</div>
  <table>
    <tr><td>Material</td><td class="num">{_money(est.material_cost)}</td></tr>
    <tr><td>Labor</td><td class="num">{_money(est.labor_cost)}</td></tr>
    <tr><td><b>Subtotal</b></td><td class="num"><b>{_money(est.subtotal)}</b></td></tr>
    <tr><td>Overhead ({project.overhead_pct:.1f}%)</td><td class="num">{_money(est.overhead)}</td></tr>
    <tr><td>Profit ({project.profit_pct:.1f}%)</td><td class="num">{_money(est.profit)}</td></tr>
    <tr><td>Contingency ({project.contingency_pct:.1f}%)</td><td class="num">{_money(est.contingency)}</td></tr>
  </table>
</div>

<h2>System Counts</h2>
<table class="counts"><tr>
  <td><div class="lbl">Cameras</div><div class="val">{c.cameras}</div></td>
  <td><div class="lbl">ACS Doors</div><div class="val">{c.doors}</div></td>
  <td><div class="lbl">IDS Points</div><div class="val">{c.ids_points}</div></td>
  <td><div class="lbl">Intercoms</div><div class="val">{c.intercoms}</div></td>
  <td><div class="lbl">Cable Runs</div><div class="val">{c.cable_runs}</div></td>
</tr></table>

<h2>Line Items ({len(items)})</h2>
{items_block}

{scope_html}
{proposal_html}
{boe_html}

<footer>Confidential — for the addressee only.</footer>
</body></html>"""


@api_router.get("/projects/{project_id}/export.pdf")
async def export_project_pdf(project_id: str):
    """Server-rendered PDF for headless / scheduled exports."""
    pdf_bytes, filename = await _render_project_pdf_bytes(project_id)
    if pdf_bytes is None:
        raise HTTPException(404, "Project not found")

    import io as _io
    from fastapi.responses import StreamingResponse

    return StreamingResponse(
        _io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


async def _render_project_pdf_bytes(project_id: str) -> tuple[Optional[bytes], str]:
    """Render the project's PDF and return (bytes, filename). Returns (None, "") on missing."""
    from xhtml2pdf import pisa
    import io as _io

    proj_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj_doc:
        return None, ""
    project = Project(**proj_doc)

    rates_doc = await db.settings.find_one({"key": "labor_rates"}, {"_id": 0})
    rates = LaborRates(**(rates_doc.get("value", {}) if rates_doc else {}))
    items = await db.estimate_items.find({"project_id": project_id}, {"_id": 0}).to_list(1000)

    material = 0.0
    labor = 0.0
    for it in items:
        material += float(it["quantity"]) * float(it["unit_cost"])
        rate = getattr(rates, it.get("labor_role", "technician"), rates.technician)
        labor += float(it["labor_hours"]) * float(rate)
    subtotal = material + labor
    overhead = subtotal * (project.overhead_pct / 100.0)
    profit = subtotal * (project.profit_pct / 100.0)
    contingency = subtotal * (project.contingency_pct / 100.0)
    total = subtotal + overhead + profit + contingency
    est = EstimateSummary(
        material_cost=round(material, 2),
        labor_cost=round(labor, 2),
        subtotal=round(subtotal, 2),
        overhead=round(overhead, 2),
        profit=round(profit, 2),
        contingency=round(contingency, 2),
        total=round(total, 2),
        item_count=len(items),
    )

    docs_raw = await db.project_documents.find_one({"project_id": project_id}, {"_id": 0})
    docs = ProjectDocuments(**docs_raw) if docs_raw else None

    html = _build_project_html(project, est, items, docs)

    buf = _io.BytesIO()
    result = pisa.CreatePDF(src=html, dest=buf, encoding="utf-8")
    if result.err:
        raise HTTPException(500, f"PDF render failed ({result.err} errors)")

    safe_name = "".join(ch if ch.isalnum() or ch in "-_" else "_" for ch in project.name).strip("_") or "project"
    return buf.getvalue(), f"{safe_name}-estimate.pdf"


# ---- Signed share links ----
import hashlib as _hashlib
import hmac as _hmac
import base64 as _b64
import time as _time
import secrets as _secrets


_CACHED_SHARE_SECRET: Optional[str] = None


async def _get_share_secret() -> str:
    """Returns the HMAC secret. Persists a generated one in the settings collection."""
    global _CACHED_SHARE_SECRET
    if _CACHED_SHARE_SECRET:
        return _CACHED_SHARE_SECRET
    env_secret = os.environ.get("SHARE_SECRET")
    if env_secret:
        _CACHED_SHARE_SECRET = env_secret
        return env_secret
    doc = await db.settings.find_one({"key": "share_secret"}, {"_id": 0})
    if doc and doc.get("value"):
        _CACHED_SHARE_SECRET = doc["value"]
        return _CACHED_SHARE_SECRET
    generated = _secrets.token_urlsafe(48)
    await db.settings.update_one(
        {"key": "share_secret"},
        {"$set": {"key": "share_secret", "value": generated}},
        upsert=True,
    )
    _CACHED_SHARE_SECRET = generated
    return generated


async def _make_share_token(project_id: str, expires_at_epoch: int) -> str:
    secret = (await _get_share_secret()).encode()
    payload = f"{project_id}|{expires_at_epoch}".encode()
    sig = _hmac.new(secret, payload, _hashlib.sha256).hexdigest()[:32]
    body = _b64.urlsafe_b64encode(payload).decode().rstrip("=")
    return f"{body}.{sig}"


async def _verify_share_token(token: str, project_id: str) -> bool:
    try:
        body_b64, sig = token.split(".", 1)
    except ValueError:
        return False
    padding = "=" * (-len(body_b64) % 4)
    try:
        payload = _b64.urlsafe_b64decode(body_b64 + padding)
        pid, exp = payload.decode().split("|")
    except Exception:
        return False
    if pid != project_id:
        return False
    try:
        if int(exp) < int(_time.time()):
            return False
    except ValueError:
        return False
    secret = (await _get_share_secret()).encode()
    expected = _hmac.new(secret, payload, _hashlib.sha256).hexdigest()[:32]
    return _hmac.compare_digest(sig, expected)


class ShareLinkRequest(BaseModel):
    ttl_minutes: int = 60


class ShareLinkResponse(BaseModel):
    path: str
    token: str
    expires_at: str
    ttl_minutes: int


@api_router.post("/projects/{project_id}/share-link", response_model=ShareLinkResponse)
async def create_share_link(project_id: str, payload: Optional[ShareLinkRequest] = None):
    """Mint a short-lived signed URL that lets non-app users download the project PDF."""
    proj = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj:
        raise HTTPException(404, "Project not found")
    ttl = (payload.ttl_minutes if payload else 60)
    ttl = max(1, min(ttl, 60 * 24 * 30))  # clamp 1 min .. 30 days
    expires_at = int(_time.time()) + ttl * 60
    token = await _make_share_token(project_id, expires_at)
    return ShareLinkResponse(
        path=f"/api/share/projects/{project_id}/export.pdf?token={token}",
        token=token,
        expires_at=datetime.fromtimestamp(expires_at, tz=timezone.utc).isoformat(),
        ttl_minutes=ttl,
    )


@api_router.get("/share/projects/{project_id}/export.pdf")
async def public_share_pdf(project_id: str, token: str):
    """Public endpoint reachable only with a valid signed token."""
    if not await _verify_share_token(token, project_id):
        raise HTTPException(403, "Invalid or expired token")
    pdf_bytes, filename = await _render_project_pdf_bytes(project_id)
    if pdf_bytes is None:
        raise HTTPException(404, "Project not found")

    import io as _io
    from fastapi.responses import StreamingResponse
    return StreamingResponse(
        _io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


# ---- Batch ZIP export ----
class BatchExportRequest(BaseModel):
    ids: List[str]


@api_router.post("/projects/export.zip")
async def export_projects_zip(payload: BatchExportRequest):
    """Returns a ZIP archive of project PDFs. Missing ids are recorded in skipped.txt."""
    import io as _io
    import zipfile
    from fastapi.responses import StreamingResponse

    if not payload.ids:
        raise HTTPException(400, "No project ids provided")

    buf = _io.BytesIO()
    skipped: List[str] = []
    rendered = 0
    seen_names: dict[str, int] = {}

    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for pid in payload.ids:
            try:
                pdf_bytes, filename = await _render_project_pdf_bytes(pid)
            except HTTPException:
                skipped.append(pid)
                continue
            if pdf_bytes is None:
                skipped.append(pid)
                continue
            # Deduplicate identical filenames
            count = seen_names.get(filename, 0)
            seen_names[filename] = count + 1
            zip_name = filename if count == 0 else filename.replace(".pdf", f"-{count + 1}.pdf")
            zf.writestr(zip_name, pdf_bytes)
            rendered += 1
        if skipped:
            zf.writestr("skipped.txt", "Project ids skipped (not found):\n" + "\n".join(skipped))

    if rendered == 0:
        raise HTTPException(404, "No matching projects found")

    buf.seek(0)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%d-%H%M%S")
    return StreamingResponse(
        buf,
        media_type="application/zip",
        headers={
            "Content-Disposition": f'attachment; filename="projects-{stamp}.zip"',
            "X-Rendered-Count": str(rendered),
            "X-Skipped-Count": str(len(skipped)),
        },
    )





# ===================== Routes: Documents (Phase 2) =====================
def _scope_defaults(proj: Project) -> ScopeDoc:
    c = proj.counts
    sites = proj.site or "the designated site"
    return ScopeDoc(
        overview=(
            f"Furnish, install, program, test, and commission the integrated electronic "
            f"security system at {sites} for {proj.customer or 'the Customer'}. Work "
            f"includes the following system counts: {c.cameras} CCTV cameras, "
            f"{c.doors} access control doors, {c.ids_points} intrusion detection points, "
            f"{c.intercoms} intercom stations, and {c.cable_runs} structured cabling runs."
        ),
        inclusions=(
            "• Furnish all materials and equipment per the equipment schedule\n"
            "• Mount, terminate, and label all devices per Division 28 specifications\n"
            "• Headend rack assembly, programming, and integration\n"
            "• Network configuration for the security VLAN as coordinated with IT\n"
            "• Factory and field testing of all installed devices\n"
            "• As-built drawings, O&M manuals, and warranty documentation"
        ),
        exclusions=(
            "• 120VAC power circuits, conduit, and J-boxes by Division 26 (Electrical)\n"
            "• Penetrations through fire-rated assemblies (firestop by GC)\n"
            "• Customer-side network infrastructure (switches, routers, firewalls)\n"
            "• Permits, fees, and bonds unless explicitly listed\n"
            "• Painting, patching, or finish work after device installation"
        ),
        testing=(
            "Pre-functional checkout per Division 28 28 31 00. 100% device functional "
            "testing witnessed by the Owner's representative. Network throughput and "
            "recording retention verification on all CCTV cameras. ACS door cycle test, "
            "anti-passback, and lockdown verification. Submit test report prior to "
            "substantial completion."
        ),
        training=(
            "Provide eight (8) hours of on-site operator training and four (4) hours of "
            "administrator training. Deliver recorded training video and quick-reference "
            "guides. Re-training visit within 90 days of substantial completion upon "
            "request."
        ),
        warranty=(
            "One (1) year parts and labor warranty on the installed security system from "
            "the date of substantial completion. Manufacturer warranties pass through to "
            "the Owner. 24-hour remote response, on-site response within one (1) business "
            "day for critical defects."
        ),
    )


def _proposal_defaults(proj: Project, est: EstimateSummary) -> ProposalDoc:
    return ProposalDoc(
        executive_summary=(
            f"{proj.customer or 'The Customer'} requires a turnkey electronic security "
            f"solution at {proj.site or 'the project site'}. The proposed design covers "
            f"{proj.counts.cameras} cameras, {proj.counts.doors} access-controlled doors, "
            f"and {proj.counts.ids_points} intrusion points integrated on a unified "
            f"platform. Total proposed price: ${est.total:,.2f}."
        ),
        technical_approach=(
            "Our approach phases the work into mobilization, rough-in, device install, "
            "programming, and commissioning. We assign a dedicated PM and lead technician "
            "for the duration of the project. Engineering deliverables include shop "
            "drawings, riser diagrams, IP schedules, and submittals reviewed within 10 "
            "business days of NTP."
        ),
        price_summary=(
            f"Material: ${est.material_cost:,.2f}\n"
            f"Labor:    ${est.labor_cost:,.2f}\n"
            f"Subtotal: ${est.subtotal:,.2f}\n"
            f"Overhead ({proj.overhead_pct:.1f}%): ${est.overhead:,.2f}\n"
            f"Profit   ({proj.profit_pct:.1f}%): ${est.profit:,.2f}\n"
            f"Contingency ({proj.contingency_pct:.1f}%): ${est.contingency:,.2f}\n"
            f"TOTAL: ${est.total:,.2f}"
        ),
        assumptions=(
            "• Work performed during standard business hours (M-F, 7am-5pm)\n"
            "• Adequate site access, staging, and secure storage provided by GC\n"
            "• Power and network drops available at all device locations\n"
            "• Drawings issued for construction are final at NTP"
        ),
        exclusions=(
            "• Permits, bonds, and prevailing wage uplifts unless noted\n"
            "• After-hours / overtime labor\n"
            "• Sales/use tax (added at invoicing if applicable)"
        ),
        acceptance=(
            "Accepted by: ____________________________________\n"
            "Printed Name: ___________________________________\n"
            f"Title: __________________________________________   Date: __________\n\n"
            f"This proposal is valid for thirty (30) days from {datetime.now(timezone.utc).strftime('%B %d, %Y')}."
        ),
    )


def _boe_defaults(proj: Project, est: EstimateSummary, items: list) -> BoeDoc:
    return BoeDoc(
        basis_of_labor=(
            f"Labor estimate of ${est.labor_cost:,.2f} is built bottom-up from "
            f"{len(items)} line items using published role rates. Productivity factors "
            f"derived from RSMeans for low-voltage security work, adjusted for "
            f"{proj.project_type.lower()} project conditions."
        ),
        basis_of_material=(
            f"Material estimate of ${est.material_cost:,.2f} is built from current "
            f"published distributor pricing as of the bid date. Lead times confirmed "
            f"with manufacturer reps; long-lead items flagged in the equipment schedule."
        ),
        risk_factors=(
            f"Contingency of {proj.contingency_pct:.1f}% (${est.contingency:,.2f}) "
            "covers unknown field conditions, minor design clarifications, and material "
            "price volatility through the install window."
        ),
        schedule_assumptions=(
            "Critical path assumes equipment delivery within 6-10 weeks of approved "
            "submittal release. Install productivity assumes single-shift work with full "
            "site access. Programming and commissioning sequenced after substantial "
            "completion of network and power infrastructure."
        ),
        clarifications=(
            "• Pricing reflects NDAA-compliant equipment where flagged\n"
            "• Final device locations to be field-verified during rough-in walk\n"
            "• Any change to the device count triggers a documented change order"
        ),
    )


def _compute_estimate_sync(proj: Project, items: list, rates: LaborRates) -> EstimateSummary:
    material = sum(float(it["quantity"]) * float(it["unit_cost"]) for it in items)
    labor = sum(
        float(it["labor_hours"]) * float(getattr(rates, it.get("labor_role", "technician"), rates.technician))
        for it in items
    )
    subtotal = material + labor
    overhead = subtotal * (proj.overhead_pct / 100.0)
    profit = subtotal * (proj.profit_pct / 100.0)
    contingency = subtotal * (proj.contingency_pct / 100.0)
    total = subtotal + overhead + profit + contingency
    return EstimateSummary(
        material_cost=round(material, 2),
        labor_cost=round(labor, 2),
        subtotal=round(subtotal, 2),
        overhead=round(overhead, 2),
        profit=round(profit, 2),
        contingency=round(contingency, 2),
        total=round(total, 2),
        item_count=len(items),
    )


@api_router.get("/projects/{project_id}/documents", response_model=ProjectDocuments)
async def get_documents(project_id: str):
    proj_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj_doc:
        raise HTTPException(404, "Project not found")
    existing = await db.project_documents.find_one({"project_id": project_id}, {"_id": 0})
    if existing:
        return ProjectDocuments(**existing)
    return ProjectDocuments(project_id=project_id)


@api_router.put("/projects/{project_id}/documents", response_model=ProjectDocuments)
async def save_documents(project_id: str, payload: ProjectDocuments):
    proj_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj_doc:
        raise HTTPException(404, "Project not found")
    data = payload.dict()
    data["project_id"] = project_id
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.project_documents.update_one(
        {"project_id": project_id},
        {"$set": data},
        upsert=True,
    )
    return ProjectDocuments(**data)


@api_router.post("/projects/{project_id}/documents/generate", response_model=ProjectDocuments)
async def generate_documents(project_id: str, section: Optional[str] = None):
    """Generate default narrative content. section: scope|proposal|boe|all (default all)."""
    proj_doc = await db.projects.find_one({"id": project_id}, {"_id": 0})
    if not proj_doc:
        raise HTTPException(404, "Project not found")
    proj = Project(**proj_doc)

    rates_doc = await db.settings.find_one({"key": "labor_rates"}, {"_id": 0})
    rates = LaborRates(**(rates_doc.get("value", {}) if rates_doc else {}))
    items = await db.estimate_items.find({"project_id": project_id}, {"_id": 0}).to_list(1000)
    est = _compute_estimate_sync(proj, items, rates)

    existing = await db.project_documents.find_one({"project_id": project_id}, {"_id": 0}) or {}
    docs = ProjectDocuments(**{**existing, "project_id": project_id})

    target = (section or "all").lower()
    if target in ("all", "scope"):
        docs.scope = _scope_defaults(proj)
    if target in ("all", "proposal"):
        docs.proposal = _proposal_defaults(proj, est)
    if target in ("all", "boe"):
        docs.boe = _boe_defaults(proj, est, items)

    data = docs.dict()
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.project_documents.update_one(
        {"project_id": project_id},
        {"$set": data},
        upsert=True,
    )
    return ProjectDocuments(**data)


# ===================== App =====================
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
