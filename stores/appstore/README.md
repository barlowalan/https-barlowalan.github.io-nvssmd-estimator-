# Apple App Store — SEP Explorer

Store-specific package for **App Store Connect** / TestFlight.

## Contents

| File | Purpose |
| --- | --- |
| `listing.json` | App Store listing copy |
| `PrivacyInfo.xcprivacy` | Apple Privacy Manifest |
| `Info.plist.additions` | Extra Info.plist keys |
| `checklist.md` | Submission checklist |
| `assets/` | Icon + screenshot slots |
| `code/` | Pointers to iOS SwiftUI sources shipped for App Store |

## Build & test (EAS)

From `frontend/`:

```bash
# Internal TestFlight-style preview
npx eas-cli build --platform ios --profile preview

# Production IPA
npx eas-cli build --platform ios --profile production-ios

# Submit (after ASC app + credentials configured)
npx eas-cli submit --platform ios --profile production-ios
```

## Local smoke test

```bash
cd frontend && yarn test:store
yarn test:policy
```

## Native Swift sources

Canonical iPad SwiftUI code lives in `/ios/SEPExplorer/`.  
A frozen store snapshot is mirrored under `code/` for App Store review archives.
