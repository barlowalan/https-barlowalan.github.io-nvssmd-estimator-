# App Store submission checklist — SEP Explorer

## Before first build
- [ ] Apple Developer Program membership active
- [ ] App Store Connect app created (`com.nvssmd.sepexplorer`)
- [ ] Replace `REPLACE_WITH_EAS_PROJECT_ID` in `frontend/app.json`
- [ ] Replace ASC App ID + Team ID in `frontend/eas.json`
- [ ] Host privacy / support / terms pages (see `stores/legal/`)
- [ ] Confirm URLs in `stores/shared/store-config.json`

## TestFlight
- [ ] `eas build --platform ios --profile preview`
- [ ] Install on physical iPad + iPhone
- [ ] Run `yarn test:store` smoke checks
- [ ] Manual QA: create project, add catalog item, edit labor rates, hit 10-project limit

## Production submit
- [ ] Upload screenshots (iPad 12.9" + iPhone 6.7")
- [ ] Paste listing from `listing.json`
- [ ] Age rating 4+, Business category
- [ ] Export compliance: **No** non-exempt encryption (`ITSAppUsesNonExemptEncryption=false`)
- [ ] Privacy nutrition labels: Data Not Collected (current Explorer)
- [ ] `eas build --platform ios --profile production-ios`
- [ ] `eas submit --platform ios --profile production-ios`
- [ ] Attach Privacy Manifest (`PrivacyInfo.xcprivacy`)

## Post-submit
- [ ] Monitor App Review messages
- [ ] Verify live privacy URL resolves over HTTPS
