import SwiftUI
import SwiftData

@main
struct SEPDrawApp: App {
    let container: ModelContainer = {
        let schema = Schema([
            DesignProject.self,
            DesignSheet.self,
            PlacedDevice.self,
            DesignLayer.self,
            CatalogDevice.self,
            CoverageZone.self,
            SchematicNode.self,
            MarkupAnnotation.self,
            ProjectDocument.self,
            DesignEstimateLine.self
        ])
        do {
            return try ModelContainer(for: schema)
        } catch {
            fatalError("SEP Draw database failed: \(error)")
        }
    }()

    var body: some Scene {
        WindowGroup {
            DesignRootView()
                .environmentObject(DesignWorkspace())
        }
        .modelContainer(container)
        .commands {
            DesignCommands()
        }
    }
}

struct DesignCommands: Commands {
    var body: some Commands {
        CommandGroup(replacing: .newItem) {
            Button("New Design Project") {
                NotificationCenter.default.post(name: .sepNewProject, object: nil)
            }
            .keyboardShortcut("n", modifiers: [.command])
        }
        CommandMenu("Import") {
            Button("Import Visio (.vsdx)…") {
                NotificationCenter.default.post(name: .sepImportVisio, object: nil)
            }
            Button("Import AutoCAD (.dxf/.dwg)…") {
                NotificationCenter.default.post(name: .sepImportCAD, object: nil)
            }
            Button("Import PDF…") {
                NotificationCenter.default.post(name: .sepImportPDF, object: nil)
            }
        }
        CommandMenu("Export") {
            Button("Export PDF…") {
                NotificationCenter.default.post(name: .sepExportPDF, object: nil)
            }
            Button("Export DXF…") {
                NotificationCenter.default.post(name: .sepExportDXF, object: nil)
            }
            Button("Export Visio XML…") {
                NotificationCenter.default.post(name: .sepExportVisio, object: nil)
            }
        }
    }
}

extension Notification.Name {
    static let sepNewProject = Notification.Name("sep.draw.newProject")
    static let sepImportVisio = Notification.Name("sep.draw.importVisio")
    static let sepImportCAD = Notification.Name("sep.draw.importCAD")
    static let sepImportPDF = Notification.Name("sep.draw.importPDF")
    static let sepExportPDF = Notification.Name("sep.draw.exportPDF")
    static let sepExportDXF = Notification.Name("sep.draw.exportDXF")
    static let sepExportVisio = Notification.Name("sep.draw.exportVisio")
}
