# SEP Explorer - PRD

## Vision
**SEP Explorer** is the free tier of Security Estimator Pro™ — an offline-capable, on-site estimating app for security contractors on **Apple iPad** and **Android**.

## ExplorerPolicy (product gates)
| Gate | Value |
| --- | --- |
| Tier | Explorer |
| Price | Free |
| Active projects | 10 |
| Catalog records | 50 |
| Labor records | 20 |
| Drawing | Not included |
| Project management | Not included |
| Finance / invoicing | Not included |

## Core entities
- **ExplorerCustomer** — name, site, contact
- **ExplorerEstimate** — project with system counts + OH/P/contingency
- **ExplorerLine** — material qty/cost + labor hours/role
- **ExplorerCatalogItem** — equipment library (≤50)
- **ExplorerLaborRate** — hourly roles (≤20)

## Platforms
1. **iOS / iPad** — SwiftUI + SwiftData (`ios/SEPExplorer`) using the provided `@main` app entry and `ExplorerPolicy`.
2. **Android** — Jetpack Compose local store (`android/SEPExplorer`) with identical policy.
3. **Expo** — shared React Native UI (`frontend`) targeting iPad + Android tablets/phones, backed by FastAPI when online; enforces the same limits client- and server-side.

## In scope
- Project list with pipeline value
- Create/edit estimates with line items and catalog pick
- Equipment catalog + CSV import (capped)
- Labor rate settings
- PDF share of estimate (Expo)

## Out of scope (Explorer)
- Drawing / coverage layouts → see **SEP Draw** (`ios/SEPDraw`)
- Gantt / project management
- Invoicing / AR / finance modules
- Multi-user cloud licensing (paid tiers)

## SEP Draw (iPad drawing)
Native SwiftUI iPad app unifying survey, Visio/CAD symbols, FOV coverage, schematics, estimating, Bluebeam-style markup, and Visio/AutoCAD/PDF import-export. Bundle ID `com.nvssmd.sepdraw`. SwiftUI sources also exported as `.txt` under `ios/SEPDraw/ExportTXT/`.
