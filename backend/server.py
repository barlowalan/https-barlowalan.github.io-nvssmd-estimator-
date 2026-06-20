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


class Equipment(EquipmentCreate):
    id: str


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
