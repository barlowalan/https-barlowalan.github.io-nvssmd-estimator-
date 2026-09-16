# Play Store submission checklist — SEP Explorer

## Before first build
- [ ] Google Play Console developer account active ($25 one-time)
- [ ] App created with package `com.nvssmd.sepexplorer`
- [ ] Create Play service account + download JSON → `google-play-service-account.json` (gitignored)
- [ ] Replace `REPLACE_WITH_EAS_PROJECT_ID` in `frontend/app.json`
- [ ] Host privacy / support pages from `stores/legal/`
- [ ] Complete Play Console Data safety using `data-safety.json`

## Internal testing
- [ ] `eas build --platform android --profile preview`
- [ ] Install APK on phone + tablet
- [ ] Run `yarn test:store`
- [ ] Manual QA: create project, catalog item, labor rates, catalog 50-limit messaging

## Production submit
- [ ] Feature graphic 1024×500 + icon 512×512
- [ ] Phone + 7" tablet screenshots
- [ ] Paste listing from `listing.json`
- [ ] Content rating questionnaire → Everyone
- [ ] `eas build --platform android --profile production-android` (AAB)
- [ ] Upload to **Internal testing** track first
- [ ] Promote to Closed / Production after QA

## Post-submit
- [ ] Confirm privacy URL HTTPS
- [ ] Monitor pre-launch report / crashes
