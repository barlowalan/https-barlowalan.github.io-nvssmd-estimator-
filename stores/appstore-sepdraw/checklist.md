# SEP Draw — App Store submission checklist

**Product:** SEP Draw  
**Bundle ID:** `com.nvssmd.sepdraw`  
**SKU:** `SEP-DRAW-IOS`  
**Primary device:** iPad  
**Code:** single-file `ios/SEPDraw/SEPDrawApp.swift` (Xcode Copy/Paste Edition)  
**Version:** 1.0.0 (build 1)

Do not submit until every **Blocker** is checked.

---

## A. Blockers

### A1. Xcode project
- [ ] New iOS App **SEPDraw**, SwiftUI, iPadOS 17+, paste `SEPDrawApp.swift`
- [ ] Or: `cd ios/SEPDraw && xcodegen generate`
- [ ] Attach `Resources/Info.plist`, `SEPDraw.entitlements`, `PrivacyInfo.xcprivacy`, `Assets.xcassets`
- [ ] App Icon visible; **Release** archive builds clean

### A2. Signing & Connect
- [ ] App ID `com.nvssmd.sepdraw` + App Store Connect record (SKU `SEP-DRAW-IOS`)
- [ ] Distribution cert + profile; **Validate App** succeeds

### A3. Privacy & legal (live URLs)
- [ ] https://nvssmd.com/sep-draw/privacy
- [ ] https://nvssmd.com/sep-draw/support
- [ ] Age **4+**; encryption exempt (`ITSAppUsesNonExemptEncryption = false`)
- [ ] App Privacy matches `PrivacyInfo.xcprivacy` (no tracking)

### A4. Screenshots (replace stubs)
Replace `stores/appstore-sepdraw/assets/screenshots/*` — files still labeled PLACEHOLDER are rejectable.
- [ ] Projects / canvas / coverage / BOM or inspector / export menu

### A5. Functional QA
- [ ] Place cameras/readers; FOV + DORI readouts
- [ ] Cable route + measure
- [ ] Import PDF + ASCII DXF
- [ ] Export **Visio SVG**, **PDF**, **AutoCAD DXF** only
- [ ] BOM sheet; save `.sepdraw`; undo/redo
- [ ] No crash on import cancel / background

---

## B. Export policy (shipping)

| Allowed | Not claimed as native without adapter |
| --- | --- |
| Visio **SVG** | Native VSDX edit/export |
| **PDF** | — |
| AutoCAD **DXF** | Native DWG edit/export |

---

## C. Assets in repo

| Asset | Path |
| --- | --- |
| App source | `ios/SEPDraw/SEPDrawApp.swift` |
| Copy/paste `.txt` | `ios/SEPDraw/ExportTXT/SEPDraw_XcodeCopyPaste.swift.txt` |
| App Icon 1024 | `ios/SEPDraw/Resources/Assets.xcassets/AppIcon.appiconset/` |
| Screenshot stubs | `stores/appstore-sepdraw/assets/screenshots/` |
| Listing | `stores/appstore-sepdraw/listing.json` |

---

## D. Submit sequence

1. A1–A5 complete  
2. Archive → App Store Connect  
3. Real screenshots + privacy answers  
4. TestFlight on physical iPad  
5. Submit for Review  

**Verdict:** packaging stubs are in-repo; **not** cleared for Submit until A blockers pass.
