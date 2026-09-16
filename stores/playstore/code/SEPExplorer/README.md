# SEP Explorer — Android (Jetpack Compose)

Offline-first **Security Estimator Pro · Explorer** free tier for Android phones and tablets.

## Policy

Same gates as iPad SwiftUI (`ExplorerPolicy`):

- 10 active projects
- 50 catalog records
- 20 labor records
- No drawing / PM / finance modules

## Open in Android Studio

1. Open `android/SEPExplorer` as a Gradle project (add a settings.gradle.kts + root if needed for your Studio version).
2. Sync Gradle, run on an Android tablet or phone emulator.
3. Data is stored locally via `SharedPreferences` JSON (parity with SwiftData on iPad).

Cross-platform Expo UI also lives in `/frontend` and enforces the same `ExplorerPolicy`.
