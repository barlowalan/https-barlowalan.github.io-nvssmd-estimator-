# SEP Design — Native iPad (SwiftUI)

**Security Estimator Pro · Design** — App Store–ready iPad drawing app for **IDS**, **access control**, **infrastructure**, and **video surveillance**.

Unifies key workflows from:

| # | Product | SEP Design module |
| --- | --- | --- |
| 1 | System Surveyor | Site survey + device drops |
| 2 | D-Tools | Design docs + BOM |
| 3 | SiteOwl | As-built / document vault |
| 4 | JVSG | Camera FOV coverage |
| 5 | IPVM | Spec / camera catalog |
| 6 | XTEN-AV | AV topology sheets |
| 7 | Jetbuilt | Proposal roll-up |
| 8 | Axis Site Designer | Camera placement + coverage |
| 9 | Vectorworks ConnectCAD | Schematic ports / risers |
| 10 | Specifi | Product specification library |
| 11 | ConEst | Labor + material takeoff |
| 12 | magicplan | Room measure / floor sketch |
| 13 | Bluebeam | PDF markup clouds & stamps |
| 14 | Simply Wise | Document filing |

## Import / Export

| Direction | Formats |
| --- | --- |
| **Import** | Visio (`.vsdx` / `.vdx`), AutoCAD (`.dxf` / `.dwg`), PDF |
| **Export** | PDF, AutoCAD DXF, Visio XML (`.vdx`), BOM CSV, SEP JSON |

Visio + CAD symbol names are shown on every library item (`FormatBadge` + stencil/block IDs).

## Open in Xcode (App Store build)

1. **File → New → Project → App** (iOS)
2. Product Name: `SEP Design`
3. Interface: **SwiftUI**, Storage: **SwiftData**
4. Bundle ID: `com.nvssmd.sepdesign`
5. Devices: **iPad** (deployment **iOS 17+**)
6. Replace generated sources with the files in this folder (keep folder groups)
7. Set `Info.plist` to `Resources/Info.plist`
8. Add `Resources/PrivacyInfo.xcprivacy` and `Resources/SEPDesign.entitlements`
9. Signing: your Apple Developer Team
10. Archive → Distribute App → App Store Connect

Or generate with XcodeGen using `project.yml`:

```bash
brew install xcodegen
cd ios/SEPDesign && xcodegen generate
open SEPDesign.xcodeproj
```

## Structure

```
SEPDesignApp.swift          @main + commands (Import/Export menus)
App/                        Policy, workspace state, seed catalog
Theme/                      Brand colors + disciplines
Models/                     SwiftData project/sheet/device graph
Symbols/                    Visio/CAD icon library + glyphs
Services/                   PDF / DXF / Visio import-export
Views/                      Root, canvas, survey, coverage, estimate…
Resources/                  Info.plist, privacy, entitlements
ExportTXT/                  Same SwiftUI sources as .txt for export
```

## App Store metadata

See [`../../stores/appstore-sepdesign/`](../../stores/appstore-sepdesign/).

## SwiftUI as .txt

Every `.swift` file is mirrored under `ExportTXT/` with a `.txt` extension for easy transfer outside Xcode.
