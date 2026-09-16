# SEP Explorer — Native iPad (SwiftUI)

Offline-first **Security Estimator Pro · Explorer** free tier for Apple iPad.

## Policy

| Limit | Value |
| --- | --- |
| Tier | Explorer (Free) |
| Active projects | 10 |
| Catalog records | 50 |
| Labor records | 20 |
| Drawing | No |
| Project management | No |
| Finance | No |

## Open in Xcode

1. Create a new iOS App project named `SEPExplorer` (SwiftUI + SwiftData).
2. Replace the generated app entry with files in this folder (or add them to the target).
3. Set deployment target iOS 17+, Devices: iPad (or Universal).
4. Build & run on iPad simulator or device.

## Structure

- `SEPExplorerApp.swift` — `@main` + `ModelContainer`
- `Policy/ExplorerPolicy.swift` — free-tier gates
- `Models/` — Customer, Estimate, Line, Catalog, Labor
- `Views/` — Tab root, projects, catalog, customers, settings

Android / cross-platform UI lives in `/frontend` (Expo).
