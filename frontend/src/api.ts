const BASE = process.env.EXPO_PUBLIC_BACKEND_URL;

export type SystemCounts = {
  cameras: number;
  doors: number;
  ids_points: number;
  intercoms: number;
  cable_runs: number;
};

export type Project = {
  id: string;
  name: string;
  customer: string;
  site: string;
  project_type: string;
  bid_due: string | null;
  scope_notes: string;
  overhead_pct: number;
  profit_pct: number;
  contingency_pct: number;
  counts: SystemCounts;
  created_at: string;
};

export type ProjectCreate = Omit<Project, "id" | "created_at">;

export type Equipment = {
  id: string;
  manufacturer: string;
  model: string;
  category: string;
  cost: number;
  ndaa: boolean;
  lead_time_days: number;
  warranty_years: number;
  part_number?: string;
  msrp?: number;
  sell_price?: number;
};

export type LaborRates = {
  technician: number;
  lead_technician: number;
  engineer: number;
  project_manager: number;
  closeout: number;
};

export type EstimateItem = {
  id: string;
  project_id: string;
  description: string;
  equipment_id: string | null;
  quantity: number;
  unit_cost: number;
  labor_hours: number;
  labor_role: keyof LaborRates;
};

export type EstimateSummary = {
  material_cost: number;
  labor_cost: number;
  subtotal: number;
  overhead: number;
  profit: number;
  contingency: number;
  total: number;
  item_count: number;
};

export type ScopeDoc = {
  overview: string;
  inclusions: string;
  exclusions: string;
  testing: string;
  training: string;
  warranty: string;
};

export type ProposalDoc = {
  executive_summary: string;
  technical_approach: string;
  price_summary: string;
  assumptions: string;
  exclusions: string;
  acceptance: string;
};

export type BoeDoc = {
  basis_of_labor: string;
  basis_of_material: string;
  risk_factors: string;
  schedule_assumptions: string;
  clarifications: string;
};

export type ProjectDocuments = {
  project_id: string;
  scope: ScopeDoc;
  proposal: ProposalDoc;
  boe: BoeDoc;
  updated_at: string;
};

export type DocSection = "scope" | "proposal" | "boe";

async function h<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const t = await res.text();
    throw new Error(`API ${res.status}: ${t}`);
  }
  return res.json();
}

const J = { "Content-Type": "application/json" };

export const api = {
  // Projects
  listProjects: () => fetch(`${BASE}/api/projects`).then((r) => h<Project[]>(r)),
  getProject: (id: string) =>
    fetch(`${BASE}/api/projects/${id}`).then((r) => h<Project>(r)),
  createProject: (p: Partial<ProjectCreate>) =>
    fetch(`${BASE}/api/projects`, { method: "POST", headers: J, body: JSON.stringify(p) }).then((r) =>
      h<Project>(r)
    ),
  updateProject: (id: string, p: Partial<ProjectCreate>) =>
    fetch(`${BASE}/api/projects/${id}`, { method: "PUT", headers: J, body: JSON.stringify(p) }).then(
      (r) => h<Project>(r)
    ),
  deleteProject: (id: string) =>
    fetch(`${BASE}/api/projects/${id}`, { method: "DELETE" }).then((r) => h(r)),

  // Equipment
  listEquipment: (category?: string) =>
    fetch(`${BASE}/api/equipment${category ? `?category=${encodeURIComponent(category)}` : ""}`).then(
      (r) => h<Equipment[]>(r)
    ),
  createEquipment: (e: Omit<Equipment, "id">) =>
    fetch(`${BASE}/api/equipment`, { method: "POST", headers: J, body: JSON.stringify(e) }).then(
      (r) => h<Equipment>(r)
    ),
  deleteEquipment: (id: string) =>
    fetch(`${BASE}/api/equipment/${id}`, { method: "DELETE" }).then((r) => h(r)),
  importEquipment: (csv_text: string, filename: string) =>
    fetch(`${BASE}/api/equipment/import`, {
      method: "POST",
      headers: J,
      body: JSON.stringify({ csv_text, filename }),
    }).then((r) =>
      h<{ filename: string; created: number; skipped: number; errors: string[] }>(r)
    ),
  importEquipmentFile: (file_b64: string, filename: string) =>
    fetch(`${BASE}/api/equipment/import-file`, {
      method: "POST",
      headers: J,
      body: JSON.stringify({ file_b64, filename }),
    }).then((r) =>
      h<{ filename: string; created: number; skipped: number; errors: string[] }>(r)
    ),

  // Labor
  getRates: () => fetch(`${BASE}/api/labor-rates`).then((r) => h<LaborRates>(r)),
  updateRates: (rates: LaborRates) =>
    fetch(`${BASE}/api/labor-rates`, { method: "PUT", headers: J, body: JSON.stringify(rates) }).then(
      (r) => h<LaborRates>(r)
    ),

  // Items & estimate
  listItems: (projectId: string) =>
    fetch(`${BASE}/api/projects/${projectId}/items`).then((r) => h<EstimateItem[]>(r)),
  addItem: (projectId: string, item: Omit<EstimateItem, "id" | "project_id">) =>
    fetch(`${BASE}/api/projects/${projectId}/items`, {
      method: "POST",
      headers: J,
      body: JSON.stringify(item),
    }).then((r) => h<EstimateItem>(r)),
  addItemsBulk: (projectId: string, items: Omit<EstimateItem, "id" | "project_id">[]) =>
    fetch(`${BASE}/api/projects/${projectId}/items/bulk`, {
      method: "POST",
      headers: J,
      body: JSON.stringify(items),
    }).then((r) => h<EstimateItem[]>(r)),
  deleteItem: (projectId: string, itemId: string) =>
    fetch(`${BASE}/api/projects/${projectId}/items/${itemId}`, { method: "DELETE" }).then((r) => h(r)),
  estimate: (projectId: string) =>
    fetch(`${BASE}/api/projects/${projectId}/estimate`).then((r) => h<EstimateSummary>(r)),

  // Documents (Phase 2)
  getDocuments: (projectId: string) =>
    fetch(`${BASE}/api/projects/${projectId}/documents`).then((r) => h<ProjectDocuments>(r)),
  saveDocuments: (projectId: string, docs: ProjectDocuments) =>
    fetch(`${BASE}/api/projects/${projectId}/documents`, {
      method: "PUT",
      headers: J,
      body: JSON.stringify(docs),
    }).then((r) => h<ProjectDocuments>(r)),
  generateDocuments: (projectId: string, section: DocSection | "all" = "all") =>
    fetch(`${BASE}/api/projects/${projectId}/documents/generate?section=${section}`, {
      method: "POST",
    }).then((r) => h<ProjectDocuments>(r)),
};

export function currency(n: number) {
  return `$${(n || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export const CATEGORIES = [
  "CCTV",
  "Access Control",
  "IDS",
  "Intercom",
  "Cabling",
  "Network/Headend",
];

export const ROLE_LABELS: Record<keyof LaborRates, string> = {
  technician: "Technician",
  lead_technician: "Lead Technician",
  engineer: "Engineer / Programmer",
  project_manager: "Project Manager",
  closeout: "Closeout / O&M",
};
