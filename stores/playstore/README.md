# Google Play Store — SEP Explorer

Store-specific package for **Google Play Console**.

## Contents

| File | Purpose |
| --- | --- |
| `listing.json` | Play Store listing copy |
| `data-safety.json` | Data safety form answers |
| `checklist.md` | Submission checklist |
| `assets/` | Feature graphic + screenshots |
| `code/` | Pointers to Android Compose sources |
| `google-play-service-account.json.example` | Service account placeholder |

## Build & test (EAS)

From `frontend/`:

```bash
# Internal testing APK
npx eas-cli build --platform android --profile preview

# Production AAB
npx eas-cli build --platform android --profile production-android

# Submit to internal track
npx eas-cli submit --platform android --profile production-android
```

## Local smoke test

```bash
cd frontend && yarn test:store
yarn test:policy
```

## Native Compose sources

Canonical Android code lives in `/android/SEPExplorer/`.  
A frozen store snapshot is mirrored under `code/` for Play review archives.
