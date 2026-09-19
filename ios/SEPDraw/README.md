# SEP Draw — Xcode Copy/Paste Edition

iOS 17+ SwiftUI security drawing app (IDS · access · CCTV · infrastructure).

**Source of truth:** `SEPDrawApp.swift`

## Features

- Device palette with discipline mapping
- Sheet-aware layers (visible / locked)
- PDF import + multi-page sheet stepper
- Two-point scale calibration (feet)
- Two-point cable routing with takeoff
- Live BOM from placed devices
- Drawing revisions
- Select / place / calibrate / route tools + delete

## Xcode setup

1. New **iOS App** named `SEPDraw` · SwiftUI · **iOS 17+** (iPad recommended)
2. Delete generated App / ContentView files
3. Add `SEPDrawApp.swift` and paste this repo’s file (or `ExportTXT/SEPDraw_XcodeCopyPaste.swift.txt`)
4. Link frameworks if needed: **PDFKit** (system)
5. Run on simulator or device
