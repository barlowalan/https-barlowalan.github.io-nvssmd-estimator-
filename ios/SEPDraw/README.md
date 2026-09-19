# SEP Draw — Foundation (Xcode Copy/Paste)

Compact iOS 17+ SwiftUI canvas starter for Security Estimator Pro · Draw.

**Source of truth:** `SEPDrawApp.swift`

## What’s in this foundation

- Sheet-aware device placements (`sheetIndex` / `activePDFPageIndex`)
- Device palette (camera, card reader, door contact, panel, switch)
- Layers model (visibility / lock hooks)
- Place vs Select tools
- Selection + Delete

## Next (not in this file yet)

PDF import, calibration, cable routing, revisions, BOM sync.

## Xcode setup

1. New **iOS App** named `SEPDraw` · SwiftUI · **iOS 17+** (iPad recommended)
2. Delete generated App / ContentView files
3. Add `SEPDrawApp.swift` and paste this repo’s file (or `ExportTXT/SEPDraw_XcodeCopyPaste.swift.txt`)
4. Run on simulator or device
