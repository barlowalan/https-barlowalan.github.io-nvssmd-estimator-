import Foundation
import SwiftData

enum DesignPolicy {
    static let tier = "Design"
    static let productName = "SEP Design"
    static let legalName = "NVSSMD, LLC"
    static let bundleId = "com.nvssmd.sepdesign"
    static let version = "1.0.0"
    static let tagline = "Survey. Design. Defend."

    static let includesDrawing = true
    static let includesCoverage = true
    static let includesSchematic = true
    static let includesEstimating = true
    static let includesDocuments = true
    static let includesImportExport = true

    static let supportedImport = ["pdf", "vsdx", "vdx", "dxf", "dwg"]
    static let supportedExport = ["pdf", "dxf", "vdx", "csv", "json"]

    static let disciplines: [SystemDiscipline] = SystemDiscipline.allCases
}

enum SeedCatalog {
    static func populate(context: ModelContext) {
        let existing = (try? context.fetch(FetchDescriptor<CatalogDevice>())) ?? []
        guard existing.isEmpty else { return }

        let items: [(String, String, String, SystemDiscipline, String, String, Double, Double)] = [
            ("AXIS-P3265", "Axis", "P3265-LVE Dome", .cctv, "Camera", "cam.dome", 649, 1.5),
            ("AXIS-Q6315", "Axis", "Q6315-LE PTZ", .cctv, "Camera", "cam.ptz", 2499, 2.0),
            ("HAN-DWC", "Hanwha", "XNV-8081Z", .cctv, "Camera", "cam.dome", 589, 1.5),
            ("AVIG-NVR16", "Avigilon", "16-ch NVR", .cctv, "Recording", "cam.nvr", 3200, 4.0),
            ("GEN-MR52", "Genetec", "Synergis Cloud Link", .access, "Controller", "acs.controller", 1895, 3.0),
            ("HID-RP40", "HID", "RP40 Reader", .access, "Reader", "acs.reader", 285, 0.75),
            ("HES-4500", "HES", "4500 Strike", .access, "Locking", "acs.lock", 210, 1.0),
            ("DSC-HS2128", "DSC", "PowerSeries Pro", .ids, "Panel", "ids.panel", 420, 4.0),
            ("BOSCH-ISC", "Bosch", "ISC-BDL2 PIR", .ids, "Sensor", "ids.pir", 68, 0.5),
            ("GE-1125", "GE", "1125 Door Contact", .ids, "Sensor", "ids.door_contact", 12, 0.35),
            ("CISCO-C9200", "Cisco", "C9200-24P PoE", .infrastructure, "Network", "infra.poe", 2100, 2.0),
            ("APC-1500", "APC", "Smart-UPS 1500", .infrastructure, "Power", "infra.ups", 650, 1.0),
            ("BIAMP-TESIRA", "Biamp", "TesiraFORTE", .av, "DSP", "av.dsp", 2800, 3.0),
            ("JBL-CONTROL", "JBL", "Control 26CT", .av, "Speaker", "av.speaker", 145, 0.5),
        ]

        for item in items {
            context.insert(CatalogDevice(
                sku: item.0,
                manufacturer: item.1,
                modelName: item.2,
                discipline: item.3,
                category: item.4,
                symbolID: item.5,
                unitCost: item.6,
                laborHours: item.7
            ))
        }
        try? context.save()
    }

    static func makeSampleProject(context: ModelContext) -> DesignProject {
        let project = DesignProject(
            name: "HQ Campus Security Upgrade",
            clientName: "North Valley Systems",
            siteAddress: "1200 Innovation Dr",
            scaleFeetPerUnit: 0.5
        )
        project.status = .design

        let floor = DesignSheet(title: "Level 1 — Floor Plan", sheetType: .floorPlan)
        floor.sortOrder = 0
        let coverage = DesignSheet(title: "Level 1 — Camera Coverage", sheetType: .coverage)
        coverage.sortOrder = 1
        let schem = DesignSheet(title: "ACS Riser", sheetType: .riser)
        schem.sortOrder = 2

        for (i, d) in SystemDiscipline.allCases.enumerated() {
            floor.layers.append(DesignLayer(name: d.rawValue, discipline: d, sortOrder: i))
        }

        let devices: [(String, String, String, SystemDiscipline, Double, Double, Double, Double)] = [
            ("cam.dome", "Lobby Dome", "CAM-01", .cctv, 420, 360, 649, 1.5),
            ("cam.bullet", "Parking Bullet", "CAM-02", .cctv, 180, 520, 520, 1.5),
            ("cam.ptz", "Yard PTZ", "CAM-03", .cctv, 700, 200, 2499, 2.0),
            ("acs.reader", "Main Entry Reader", "RDR-01", .access, 380, 400, 285, 0.75),
            ("acs.lock", "Main Strike", "LCK-01", .access, 400, 400, 210, 1.0),
            ("acs.controller", "ACS Panel", "ACS-01", .access, 900, 120, 1895, 3.0),
            ("ids.pir", "Hall PIR", "PIR-01", .ids, 520, 300, 68, 0.5),
            ("ids.door_contact", "Dock Contact", "DC-01", .ids, 240, 480, 12, 0.35),
            ("ids.panel", "IDS Panel", "IDS-01", .ids, 920, 160, 420, 4.0),
            ("infra.poe", "IDF PoE Switch", "SW-01", .infrastructure, 880, 140, 2100, 2.0),
        ]

        for d in devices {
            let placed = PlacedDevice(symbolID: d.0, label: d.1, tag: d.2, discipline: d.3, x: d.4, y: d.5)
            placed.unitCost = d.6
            placed.laborHours = d.7
            floor.devices.append(placed)
        }

        let z1 = CoverageZone(kind: .cameraFOV, originX: 420, originY: 360, headingDegrees: 225, fovDegrees: 100, rangeFeet: 45)
        z1.deviceID = floor.devices.first?.id
        floor.coverageZones.append(z1)
        floor.coverageZones.append(CoverageZone(kind: .cameraFOV, originX: 180, originY: 520, headingDegrees: 45, fovDegrees: 70, rangeFeet: 60))
        floor.coverageZones.append(CoverageZone(kind: .cameraFOV, originX: 700, originY: 200, headingDegrees: 180, fovDegrees: 60, rangeFeet: 120))

        floor.markups.append(MarkupAnnotation(kind: .cloud, text: "Verify mounting height", x: 500, y: 280))
        floor.markups.append(MarkupAnnotation(kind: .callout, text: "PoE budget OK", x: 860, y: 100))

        project.sheets = [floor, coverage, schem]
        project.documents = [
            ProjectDocument(title: "Architectural Floor Plan", kind: .floorPlanPDF, fileName: "L1_Arch.pdf"),
            ProjectDocument(title: "Existing ACS Visio", kind: .visio, fileName: "ACS_Existing.vsdx"),
            ProjectDocument(title: "Site Survey Photos", kind: .photo, fileName: "Survey_Album"),
        ]

        for d in floor.devices {
            project.estimateLines.append(DesignEstimateLine(
                descriptionText: "\(d.label) (\(d.tag))",
                quantity: 1,
                unitCost: d.unitCost,
                laborHours: d.laborHours
            ))
        }

        context.insert(project)
        try? context.save()
        return project
    }
}
