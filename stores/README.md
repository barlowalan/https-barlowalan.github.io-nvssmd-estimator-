# SEP Explorer — Store packages

Per-store submission packages for **Apple App Store** and **Google Play**.

```
stores/
  shared/store-config.json     # Canonical IDs, URLs, version
  legal/                       # Privacy, Terms, Support (host these)
  appstore/                    # App Store Connect package
    code/                      # Synced SwiftUI + policy snapshot
    listing.json
    PrivacyInfo.xcprivacy
    checklist.md
    assets/
  playstore/                   # Google Play package
    code/                      # Synced Compose + policy snapshot
    listing.json
    data-safety.json
    checklist.md
    assets/
  scripts/
    sync-store-code.js         # Save code for each store
    generate-store-assets.js   # Icons / feature graphic / screenshot shells
    validate-store.js          # Readiness gate for testing
```

## Prepare for testing

```bash
cd frontend
yarn install
yarn store:prepare    # assets + sync code packages + tests
```

## Preview builds (TestFlight / Play internal)

```bash
cd frontend
npx eas-cli login
# create project once, paste projectId into app.json extra.eas.projectId

yarn build:ios:preview
yarn build:android:preview
```

## Production submit

1. Complete checklists in `appstore/checklist.md` and `playstore/checklist.md`
2. Host `legal/*.html` at the URLs in `shared/store-config.json`
3. Fill ASC / Play credentials in `frontend/eas.json`
4. `yarn build:ios` / `yarn build:android`
5. `yarn submit:ios` / `yarn submit:android`

Strict submit gate: `STORE_STRICT=1 yarn store:validate`
