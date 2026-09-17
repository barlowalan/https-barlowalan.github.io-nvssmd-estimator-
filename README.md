# SEP Explorer — Security Estimator Pro free tier

Cross-platform on-site estimating for security contractors.

| Platform | Location |
| --- | --- |
| **Apple iPad** (SwiftUI + SwiftData) | [`ios/SEPExplorer`](ios/SEPExplorer) |
| **Apple iPad Draw** (SwiftUI drawing) | [`ios/SEPDraw`](ios/SEPDraw) |
| **Android** (Jetpack Compose) | [`android/SEPExplorer`](android/SEPExplorer) |
| **Expo** (iPad + Android shared UI) | [`frontend`](frontend) |
| **API** | [`backend`](backend) |
| **App Store package** | [`stores/appstore`](stores/appstore) |
| **Play Store package** | [`stores/playstore`](stores/playstore) |

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

## Store-ready testing

```bash
cd frontend
yarn install
yarn store:prepare          # assets + sync per-store code + tests
yarn build:ios:preview      # TestFlight-style (needs EAS login)
yarn build:android:preview  # Play internal APK (needs EAS login)
```

See [`stores/README.md`](stores/README.md) for App Store / Play submit steps.

## Quick start (Expo)

```bash
cd backend && python3 run_demo.py
cd frontend && yarn && EXPO_PUBLIC_BACKEND_URL=http://localhost:8000 yarn start
```
