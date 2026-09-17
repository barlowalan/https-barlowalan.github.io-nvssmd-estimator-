import Foundation
import SwiftData
import SwiftUI
import CoreGraphics

// MARK: - Project

@Model
final class DesignProject {
    var id: UUID
    var name: String
    var clientName: String
    var siteAddress: String
    var createdAt: Date
    var updatedAt: Date
    var statusRaw: String
    var notes: String
    var scaleFeetPerUnit: Double

    @Relationship(deleteRule: .cascade, inverse: \DesignSheet.project)
    var sheets: [DesignSheet]

    @Relationship(deleteRule: .cascade, inverse: \ProjectDocument.project)
    var documents: [ProjectDocument]

    @Relationship(deleteRule: .cascade, inverse: \DesignEstimateLine.project)
    var estimateLines: [DesignEstimateLine]

    init(
        name: String,
        clientName: String = "",
        siteAddress: String = "",
        scaleFeetPerUnit: Double = 0.5
    ) {
        self.id = UUID()
        self.name = name
        self.clientName = clientName
        self.siteAddress = siteAddress
        self.createdAt = Date()
        self.updatedAt = Date()
        self.statusRaw = ProjectStatus.survey.rawValue
        self.notes = ""
        self.scaleFeetPerUnit = scaleFeetPerUnit
        self.sheets = []
        self.documents = []
        self.estimateLines = []
    }

    var status: ProjectStatus {
        get { ProjectStatus(rawValue: statusRaw) ?? .survey }
        set { statusRaw = newValue.rawValue }
    }
}

enum ProjectStatus: String, Codable, CaseIterable {
    case survey = "Site Survey"
    case design = "Design"
    case estimate = "Estimate"
    case proposal = "Proposal"
    case asBuilt = "As-Built"
    case complete = "Complete"
}

// MARK: - Sheet (floor plan / schematic page)

@Model
final class DesignSheet {
    var id: UUID
    var title: String
    var sheetTypeRaw: String
    var width: Double
    var height: Double
    var backgroundPDFBookmark: String?
    var sortOrder: Int
    var project: DesignProject?

    @Relationship(deleteRule: .cascade, inverse: \DesignLayer.sheet)
    var layers: [DesignLayer]

    @Relationship(deleteRule: .cascade, inverse: \PlacedDevice.sheet)
    var devices: [PlacedDevice]

    @Relationship(deleteRule: .cascade, inverse: \CoverageZone.sheet)
    var coverageZones: [CoverageZone]

    @Relationship(deleteRule: .cascade, inverse: \SchematicNode.sheet)
    var schematicNodes: [SchematicNode]

    @Relationship(deleteRule: .cascade, inverse: \MarkupAnnotation.sheet)
    var markups: [MarkupAnnotation]

    init(title: String, sheetType: SheetType = .floorPlan, width: Double = 2400, height: Double = 1800) {
        self.id = UUID()
        self.title = title
        self.sheetTypeRaw = sheetType.rawValue
        self.width = width
        self.height = height
        self.sortOrder = 0
        self.layers = []
        self.devices = []
        self.coverageZones = []
        self.schematicNodes = []
        self.markups = []
    }

    var sheetType: SheetType {
        get { SheetType(rawValue: sheetTypeRaw) ?? .floorPlan }
        set { sheetTypeRaw = newValue.rawValue }
    }
}

enum SheetType: String, Codable, CaseIterable {
    case floorPlan = "Floor Plan"
    case sitePlan = "Site Plan"
    case schematic = "Schematic"
    case riser = "Riser Diagram"
    case coverage = "Coverage Map"
    case detail = "Detail"
}

// MARK: - Layers

@Model
final class DesignLayer {
    var id: UUID
    var name: String
    var disciplineRaw: String
    var isVisible: Bool
    var isLocked: Bool
    var opacity: Double
    var sortOrder: Int
    var sheet: DesignSheet?

    init(name: String, discipline: SystemDiscipline, sortOrder: Int = 0) {
        self.id = UUID()
        self.name = name
        self.disciplineRaw = discipline.rawValue
        self.isVisible = true
        self.isLocked = false
        self.opacity = 1.0
        self.sortOrder = sortOrder
    }

    var discipline: SystemDiscipline {
        get { SystemDiscipline(rawValue: disciplineRaw) ?? .infrastructure }
        set { disciplineRaw = newValue.rawValue }
    }
}

// MARK: - Placed device (Visio/CAD symbol instance)

@Model
final class PlacedDevice {
    var id: UUID
    var symbolID: String
    var label: String
    var tag: String
    var disciplineRaw: String
    var x: Double
    var y: Double
    var rotation: Double
    var scale: Double
    var catalogSKU: String?
    var manufacturer: String?
    var modelName: String?
    var unitCost: Double
    var laborHours: Double
    var notes: String
    var layerID: UUID?
    var sheet: DesignSheet?

    init(
        symbolID: String,
        label: String,
        tag: String,
        discipline: SystemDiscipline,
        x: Double,
        y: Double
    ) {
        self.id = UUID()
        self.symbolID = symbolID
        self.label = label
        self.tag = tag
        self.disciplineRaw = discipline.rawValue
        self.x = x
        self.y = y
        self.rotation = 0
        self.scale = 1
        self.unitCost = 0
        self.laborHours = 0
        self.notes = ""
    }

    var discipline: SystemDiscipline {
        get { SystemDiscipline(rawValue: disciplineRaw) ?? .infrastructure }
        set { disciplineRaw = newValue.rawValue }
    }

    var position: CGPoint {
        get { CGPoint(x: x, y: y) }
        set { x = newValue.x; y = newValue.y }
    }
}

// MARK: - Camera / sensor coverage (JVSG + Axis Site Designer)

@Model
final class CoverageZone {
    var id: UUID
    var deviceID: UUID?
    var kindRaw: String
    var originX: Double
    var originY: Double
    var headingDegrees: Double
    var fovDegrees: Double
    var rangeFeet: Double
    var tiltDegrees: Double
    var isDetectable: Bool
    var sheet: DesignSheet?

    init(
        kind: CoverageKind = .cameraFOV,
        originX: Double,
        originY: Double,
        headingDegrees: Double = 0,
        fovDegrees: Double = 90,
        rangeFeet: Double = 40
    ) {
        self.id = UUID()
        self.kindRaw = kind.rawValue
        self.originX = originX
        self.originY = originY
        self.headingDegrees = headingDegrees
        self.fovDegrees = fovDegrees
        self.rangeFeet = rangeFeet
        self.tiltDegrees = 0
        self.isDetectable = true
    }

    var kind: CoverageKind {
        get { CoverageKind(rawValue: kindRaw) ?? .cameraFOV }
        set { kindRaw = newValue.rawValue }
    }
}

enum CoverageKind: String, Codable, CaseIterable {
    case cameraFOV = "Camera FOV"
    case pir = "PIR Motion"
    case microwave = "Microwave"
    case cardReader = "Reader Range"
    case wifiAP = "Wireless AP"
    case speaker = "Audio Coverage"
}

// MARK: - Schematic / ConnectCAD-style nodes

@Model
final class SchematicNode {
    var id: UUID
    var title: String
    var symbolID: String
    var x: Double
    var y: Double
    var portsJSON: String
    var connectedToJSON: String
    var sheet: DesignSheet?

    init(title: String, symbolID: String, x: Double, y: Double) {
        self.id = UUID()
        self.title = title
        self.symbolID = symbolID
        self.x = x
        self.y = y
        self.portsJSON = "[]"
        self.connectedToJSON = "[]"
    }
}

// MARK: - Bluebeam-style markup

@Model
final class MarkupAnnotation {
    var id: UUID
    var kindRaw: String
    var text: String
    var x: Double
    var y: Double
    var width: Double
    var height: Double
    var strokeHex: String
    var author: String
    var createdAt: Date
    var sheet: DesignSheet?

    init(kind: MarkupKind, text: String, x: Double, y: Double) {
        self.id = UUID()
        self.kindRaw = kind.rawValue
        self.text = text
        self.x = x
        self.y = y
        self.width = 160
        self.height = 48
        self.strokeHex = "#C5A059"
        self.author = "Designer"
        self.createdAt = Date()
    }

    var kind: MarkupKind {
        get { MarkupKind(rawValue: kindRaw) ?? .cloud }
        set { kindRaw = newValue.rawValue }
    }
}

enum MarkupKind: String, Codable, CaseIterable {
    case cloud = "Cloud"
    case callout = "Callout"
    case highlight = "Highlight"
    case dimension = "Dimension"
    case stamp = "Stamp"
    case pen = "Pen"
    case arrow = "Arrow"
}

// MARK: - Documents (Simply Wise + SiteOwl)

@Model
final class ProjectDocument {
    var id: UUID
    var title: String
    var kindRaw: String
    var fileName: String
    var importedAt: Date
    var notes: String
    var project: DesignProject?

    init(title: String, kind: DocumentKind, fileName: String) {
        self.id = UUID()
        self.title = title
        self.kindRaw = kind.rawValue
        self.fileName = fileName
        self.importedAt = Date()
        self.notes = ""
    }

    var kind: DocumentKind {
        get { DocumentKind(rawValue: kindRaw) ?? .other }
        set { kindRaw = newValue.rawValue }
    }
}

enum DocumentKind: String, Codable, CaseIterable {
    case floorPlanPDF = "Floor Plan PDF"
    case visio = "Visio"
    case autocad = "AutoCAD"
    case photo = "Site Photo"
    case asBuilt = "As-Built"
    case proposal = "Proposal"
    case submittal = "Submittal"
    case other = "Other"
}

// MARK: - Catalog (Specifi + IPVM + D-Tools)

@Model
final class CatalogDevice {
    var id: UUID
    var sku: String
    var manufacturer: String
    var modelName: String
    var disciplineRaw: String
    var category: String
    var symbolID: String
    var unitCost: Double
    var laborHours: Double
    var specsJSON: String
    var datasheetURL: String?

    init(
        sku: String,
        manufacturer: String,
        modelName: String,
        discipline: SystemDiscipline,
        category: String,
        symbolID: String,
        unitCost: Double,
        laborHours: Double = 1.0
    ) {
        self.id = UUID()
        self.sku = sku
        self.manufacturer = manufacturer
        self.modelName = modelName
        self.disciplineRaw = discipline.rawValue
        self.category = category
        self.symbolID = symbolID
        self.unitCost = unitCost
        self.laborHours = laborHours
        self.specsJSON = "{}"
    }

    var discipline: SystemDiscipline {
        get { SystemDiscipline(rawValue: disciplineRaw) ?? .infrastructure }
        set { disciplineRaw = newValue.rawValue }
    }
}

// MARK: - Estimate lines (ConEst + Jetbuilt + D-Tools)

@Model
final class DesignEstimateLine {
    var id: UUID
    var descriptionText: String
    var quantity: Double
    var unitCost: Double
    var laborHours: Double
    var laborRate: Double
    var category: String
    var sourceDeviceID: UUID?
    var project: DesignProject?

    init(descriptionText: String, quantity: Double, unitCost: Double, laborHours: Double, laborRate: Double = 95) {
        self.id = UUID()
        self.descriptionText = descriptionText
        self.quantity = quantity
        self.unitCost = unitCost
        self.laborHours = laborHours
        self.laborRate = laborRate
        self.category = "Equipment"
    }

    var materialTotal: Double { quantity * unitCost }
    var laborTotal: Double { quantity * laborHours * laborRate }
    var extended: Double { materialTotal + laborTotal }
}
