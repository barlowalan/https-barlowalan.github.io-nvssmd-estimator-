# SEP Draw — Xcode Copy/Paste Edition

Native iPad security drawing app (IDS · access control · CCTV · infrastructure).

**Bundle ID:** `com.nvssmd.sepdraw`  
**Deployment:** iPadOS 17+  
**Source of truth:** single file `SEPDrawApp.swift`

## Exports (only)

| Format | What you get |
| --- | --- |
| **Visio** | SVG vector drawing (opens / inserts in Microsoft Visio) |
| **PDF** | Flattened drawing sheet |
| **AutoCAD** | ASCII DXF |

DWG / native VSDX stay attachable for round-trip; editable conversion needs licensed adapters (hooks included).

## Xcode setup (fastest)

1. Create a new **iOS App** named `SEPDraw`.
2. Interface: **SwiftUI**; Language: **Swift**; Devices: **iPad**; deployment **iPadOS 17+**.
3. Delete the generated App / ContentView Swift files.
4. Add one Swift file named `SEPDrawApp.swift`.
5. Paste the entire contents of this repo’s `SEPDrawApp.swift` (or `ExportTXT/SEPDraw_XcodeCopyPaste.swift.txt`).
6. Optional: add `Resources/Assets.xcassets`, `Resources/Info.plist`, `Resources/PrivacyInfo.xcprivacy`, `Resources/SEPDraw.entitlements`.
7. Run on an **iPad** simulator or device.

## Or generate with XcodeGen

```bash
brew install xcodegen
cd ios/SEPDraw && xcodegen generate && open SEPDraw.xcodeproj
```

## Features in this build

- Device library (video / access / IDS / infrastructure) with NDAA/TAA flags  
- Canvas: place, move, cable routes, measure, PencilKit markup, FOV cones + DORI/PPF  
- Layers, revisions, undo/redo, on-device `.sepdraw` save  
- BOM takeoff + PoE / storage / cable engineering warnings  
- Import: `.sepdraw`, PDF background, ASCII DXF vectors; DWG/VSDX retained as source  

## App Store package

See [`../../stores/appstore-sepdraw/`](../../stores/appstore-sepdraw/) — icon, screenshot stubs, and blocker checklist.
