# NVSSMD Mobile Estimator - PRD

## Vision
Mobile-first version of the NVSSMD Security Engineering & Estimating Platform blueprint. Phase-1 MVP allows security contractors to capture project intake, system counts, devices and labor on-site, and instantly see the priced estimate (material + labor + OH&P + contingency).

## Phase 1 (Implemented)
- **Projects** (list, create, view, delete) with customer, site, type (Commercial / Federal / Union), and counts for CCTV cameras, ACS doors, IDS points, intercoms, cabling runs.
- **Estimate engine** - per-project material + labor (hours × role-rate) + overhead/profit/contingency percentages = total sell price; live-recalculated.
- **Line items** per project (description, qty, unit cost, labor hours, labor role) with optional pick-from-library shortcut.
- **Equipment library** (manufacturer, model, category, cost, NDAA flag, lead time, warranty), filterable by category chip row.
- **Labor rate builder** (technician, lead, engineer, PM, closeout) global hourly rates.

## Architecture
- **Backend**: FastAPI + Motor/MongoDB, all `/api/*` routes, UUID ids, no `_id` in responses.
- **Frontend**: Expo Router tabs (Projects / Equipment / Settings) + modal Stack screens for create flows + project detail.
- **Design**: iOS-native sage-green personality per `/app/design_guidelines.json`.

## Out of Scope (Future Phases)
- AI narrative writing (BOE, scope, executive summary, federal proposal)
- PDF/DOCX export
- Gantt / timeline view
- Federal compliance libraries & submittal register
- Cloud sync / licensing / multi-user collaboration

## Business Hook
**Pipeline value badge** in the Projects header sums every project's total sell price - a glanceable book-of-business metric estimators can quote to their VP in 2 seconds.
