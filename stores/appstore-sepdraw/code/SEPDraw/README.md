# SEP Draw — Native iPad (SwiftUI)

**Security Estimator Pro · Draw** — iPad drawing app for **IDS**, **access control**, **infrastructure**, and **video surveillance**.

Bundle ID: `com.nvssmd.sepdraw`

## App Store assets (in-repo)

| Item | Location |
| --- | --- |
| App Icon (1024) | `Resources/Assets.xcassets/AppIcon.appiconset/` |
| Brand colors | `Resources/Assets.xcassets/BrandNavy.colorset`, `BrandGold`, `AccentColor` |
| Screenshot stubs | `../../stores/appstore-sepdraw/assets/screenshots/` |
| Submission gate list | `../../stores/appstore-sepdraw/checklist.md` |
| Listing copy | `../../stores/appstore-sepdraw/listing.json` |

> Screenshot files are **placeholders**. Replace them with real simulator/device captures before Submit for Review.

## Open in Xcode

```bash
brew install xcodegen   # once
cd ios/SEPDraw
xcodegen generate
open SEPDraw.xcodeproj
```

Or: File → New → App (SwiftUI + SwiftData), bundle `com.nvssmd.sepdraw`, iPad, iOS 17+, then add these sources and set Info.plist / entitlements / Assets.

## Import / Export

| Direction | Formats |
| --- | --- |
| Import | Visio `.vsdx`/`.vdx`, AutoCAD `.dxf`/`.dwg`, PDF |
| Export | PDF, DXF, Visio XML, BOM CSV, SEP JSON |

## SwiftUI as .txt

Mirrored under `ExportTXT/` including `SEPDraw_All_SwiftUI.txt`.
