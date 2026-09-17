# SEP Draw — App Store submission checklist

**Product:** SEP Draw  
**Bundle ID:** `com.nvssmd.sepdraw`  
**SKU:** `SEP-DRAW-IOS`  
**Primary device:** iPad  
**Version:** 1.0.0 (build 1)

Use this as the single gate list. Do not submit until every **Blocker** is checked.

---

## A. Blockers (must complete)

### A1. Xcode project
- [ ] On a Mac: `cd ios/SEPDraw && xcodegen generate` **or** File → New → App and add all sources
- [ ] Target = iPad, deployment **iOS 17+**, bundle `com.nvssmd.sepdraw`
- [ ] `Resources/Info.plist`, `Resources/SEPDraw.entitlements`, `Resources/PrivacyInfo.xcprivacy` attached
- [ ] `Resources/Assets.xcassets` included; App Icon shows in General settings
- [ ] Scheme **SEP Draw** builds **Release** with zero errors

### A2. Signing & Connect
- [ ] Apple Developer Team selected; unique App ID `com.nvssmd.sepdraw` registered
- [ ] App Store Connect app created (name **SEP Draw**, SKU `SEP-DRAW-IOS`)
- [ ] Distribution certificate + App Store provisioning profile valid
- [ ] Archive → Validate App succeeds

### A3. Privacy & legal URLs (live)
- [ ] https://nvssmd.com/sep-draw/privacy — live HTML policy
- [ ] https://nvssmd.com/sep-draw/support — live support page + email
- [ ] https://nvssmd.com/sep-draw/terms — live terms (if paid / account later)
- [ ] Age rating questionnaire completed (expected **4+**)
- [ ] Export compliance: **ITSAppUsesNonExemptEncryption = false** (already in Info.plist)
- [ ] App Privacy: **no tracking**, no collected data types (matches `PrivacyInfo.xcprivacy`)

### A4. Store screenshots (real captures — placeholders are NOT acceptable for review)
Replace stubs in `stores/appstore-sepdraw/assets/screenshots/`:
- [ ] `ipad-12-9-01-projects.png` — real Projects UI
- [ ] `ipad-12-9-02-canvas.png` — canvas + Visio/CAD symbol library
- [ ] `ipad-12-9-03-coverage.png` — FOV coverage
- [ ] `ipad-12-9-04-estimate.png` — estimate / proposal roll-up
- [ ] `ipad-12-9-05-documents.png` — document vault / import
- [ ] Optional: iPhone 6.7" set if you enable Universal later (app is iPad-primary today)

### A5. Functional QA on device or simulator
- [ ] Launch → **Load Sample Campus** works
- [ ] Place IDS / ACS / CCTV / Infra symbols; drag; erase
- [ ] Coverage wedges render; markup clouds place
- [ ] Import sample **PDF**, **DXF**, and **Visio (.vsdx/.vdx)** via Files
- [ ] Export **PDF**, **DXF**, **Visio XML**, **BOM CSV** via share sheet
- [ ] Estimate rebuild-from-devices + Share Proposal
- [ ] No crash on cold launch / background / file import cancel

---

## B. Listing copy (ready to paste)

Source: `stores/appstore-sepdraw/listing.json`

- [ ] Name: **SEP Draw**
- [ ] Subtitle: **Security CAD for iPad**
- [ ] Promotional text pasted
- [ ] Description pasted
- [ ] Keywords pasted (≤100 chars)
- [ ] Support / Marketing / Privacy URLs set
- [ ] Copyright: **2026 NVSSMD, LLC**
- [ ] Review notes pasted (mentions Load Sample Campus)

---

## C. Assets in this repo

| Asset | Path | Status |
| --- | --- | --- |
| App Icon 1024 | `ios/SEPDraw/Resources/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` | Stub icon ready |
| Accent / brand colors | `Assets.xcassets/*Color*.colorset` | Ready |
| Marketing icon copy | `stores/appstore-sepdraw/assets/icon-1024.png` | Ready |
| Screenshot stubs | `stores/appstore-sepdraw/assets/screenshots/` | **Replace before submit** |
| Privacy manifest | `ios/SEPDraw/Resources/PrivacyInfo.xcprivacy` | Ready |
| Entitlements | `ios/SEPDraw/Resources/SEPDraw.entitlements` | Ready |

---

## D. Submit sequence

1. [ ] All **A** blockers checked  
2. [ ] Bump build number if re-uploading  
3. [ ] Xcode → Organize → Distribute App → App Store Connect  
4. [ ] Wait for processing; select build on version 1.0.0  
5. [ ] Attach real screenshots; confirm privacy answers  
6. [ ] Add to TestFlight → smoke test on physical iPad  
7. [ ] Submit for Review  

---

## E. Not ready if…

- App Icon missing or rejected (transparency / wrong size)  
- Screenshots still say **PLACEHOLDER**  
- Privacy/support URLs 404  
- Validate App fails  
- Import/export untested  

**Verdict today:** code + packaging stubs are in-repo; **not** cleared for Submit until A1–A5 are done.
