import Foundation
import SwiftUI
import Combine
import UniformTypeIdentifiers

/// Shared workspace state for the iPad drawing surface.
@MainActor
final class DesignWorkspace: ObservableObject {
    @Published var selectedTool: DesignTool = .select
    @Published var selectedSymbolID: String?
    @Published var selectedDiscipline: SystemDiscipline? = nil
    @Published var selectedDeviceID: UUID?
    @Published var canvasZoom: CGFloat = 1.0
    @Published var canvasOffset: CGSize = .zero
    @Published var showGrid = true
    @Published var showCoverage = true
    @Published var showLayers = true
    @Published var showLibrary = true
    @Published var activeMode: WorkspaceMode = .draw
    @Published var lastImportMessage: String?
    @Published var lastExportMessage: String?
    @Published var isImporting = false
    @Published var isExporting = false

    enum WorkspaceMode: String, CaseIterable, Identifiable {
        case draw = "Draw"
        case survey = "Survey"
        case coverage = "Coverage"
        case schematic = "Schematic"
        case markup = "Markup"
        case estimate = "Estimate"
        case documents = "Documents"

        var id: String { rawValue }

        var systemImage: String {
            switch self {
            case .draw: return "pencil.and.ruler"
            case .survey: return "camera.viewfinder"
            case .coverage: return "cone"
            case .schematic: return "point.3.connected.trianglepath.dotted"
            case .markup: return "pencil.tip.crop.circle"
            case .estimate: return "dollarsign.circle"
            case .documents: return "doc.on.doc"
            }
        }

        /// Maps to the industry-tool inspirations surfaced in the UI.
        var inspiredBy: String {
            switch self {
            case .draw: return "System Surveyor · Axis Site Designer · magicplan"
            case .survey: return "System Surveyor · magicplan · SiteOwl"
            case .coverage: return "JVSG · Axis Site Designer · IPVM"
            case .schematic: return "Vectorworks ConnectCAD · XTEN-AV · D-Tools"
            case .markup: return "Bluebeam · SiteOwl"
            case .estimate: return "ConEst · Jetbuilt · D-Tools · Specifi"
            case .documents: return "Simply Wise · SiteOwl · Bluebeam"
            }
        }
    }
}

enum DesignTool: String, CaseIterable, Identifiable {
    case select
    case pan
    case place
    case measure
    case wall
    case coverage
    case markup
    case connect
    case erase

    var id: String { rawValue }

    var label: String {
        switch self {
        case .select: return "Select"
        case .pan: return "Pan"
        case .place: return "Place"
        case .measure: return "Measure"
        case .wall: return "Wall"
        case .coverage: return "Coverage"
        case .markup: return "Markup"
        case .connect: return "Connect"
        case .erase: return "Erase"
        }
    }

    var systemImage: String {
        switch self {
        case .select: return "arrow.up.left.and.arrow.down.right"
        case .pan: return "hand.draw"
        case .place: return "plus.viewfinder"
        case .measure: return "ruler"
        case .wall: return "rectangle.split.2x1"
        case .coverage: return "cone"
        case .markup: return "pencil.tip"
        case .connect: return "line.diagonal"
        case .erase: return "eraser"
        }
    }
}

/// Bridges the 14 reference products into SEP Design feature modules.
enum IndustryBridge {
    struct Capability: Identifiable {
        let id: String
        let product: String
        let sepFeature: String
        let mode: DesignWorkspace.WorkspaceMode
    }

    static let capabilities: [Capability] = [
        .init(id: "1", product: "System Surveyor", sepFeature: "Site survey walkthrough, floor plans, device drops", mode: .survey),
        .init(id: "2", product: "D-Tools", sepFeature: "Design documentation + BOM from placed devices", mode: .estimate),
        .init(id: "3", product: "SiteOwl", sepFeature: "As-built photos, project document vault", mode: .documents),
        .init(id: "4", product: "JVSG", sepFeature: "Camera FOV cones & pixel-density planning", mode: .coverage),
        .init(id: "5", product: "IPVM", sepFeature: "Camera/spec catalog intelligence", mode: .estimate),
        .init(id: "6", product: "XTEN-AV", sepFeature: "AV signal-flow & topology sheets", mode: .schematic),
        .init(id: "7", product: "Jetbuilt", sepFeature: "Proposal-ready pricing from drawings", mode: .estimate),
        .init(id: "8", product: "Axis Site Designer", sepFeature: "Camera placement & coverage design", mode: .coverage),
        .init(id: "9", product: "Vectorworks ConnectCAD", sepFeature: "Schematic ports, risers, cable schedules", mode: .schematic),
        .init(id: "10", product: "Specifi", sepFeature: "Manufacturer product specification library", mode: .estimate),
        .init(id: "11", product: "ConEst", sepFeature: "Low-voltage takeoff & labor estimating", mode: .estimate),
        .init(id: "12", product: "magicplan", sepFeature: "Quick floor-plan sketch & room measure", mode: .survey),
        .init(id: "13", product: "Bluebeam", sepFeature: "PDF markup, clouds, stamps, collaboration", mode: .markup),
        .init(id: "14", product: "Simply Wise", sepFeature: "Document filing & searchable project records", mode: .documents),
    ]
}
