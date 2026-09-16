# SEP Explorer — Security Estimator Pro free tier

Cross-platform on-site estimating for security contractors.

| Platform | Location |
| --- | --- |
| **Apple iPad** (SwiftUI + SwiftData) | [`ios/SEPExplorer`](ios/SEPExplorer) |
| **Android** (Jetpack Compose) | [`android/SEPExplorer`](android/SEPExplorer) |
| **Expo** (iPad + Android shared UI) | [`frontend`](frontend) |
| **API** | [`backend`](backend) |

## ExplorerPolicy

```
tier = Explorer (Free)
activeProjectLimit = 10
catalogRecordLimit = 50
laborRecordLimit = 20
includesDrawing = false
includesProjectManagement = false
includesFinance = false
```

## Quick start (Expo)

```bash
cd backend && uvicorn server:app --reload --host 0.0.0.0 --port 8000
cd frontend && yarn && EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 yarn start
```
