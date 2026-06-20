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


def strip_id(doc: dict) -> dict:
    doc.pop("_id", None)
    return doc


# ===================== Routes: Projects =====================
@api_router.get("/")
async def root():
    return {"message": "NVSSMD Estimator API"}


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
