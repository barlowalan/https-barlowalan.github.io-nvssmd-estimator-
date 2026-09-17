import SwiftUI
import SwiftData
import UniformTypeIdentifiers

struct WorkspaceDetail: View {
    @Bindable var project: DesignProject
    @EnvironmentObject private var workspace: DesignWorkspace
    @State private var activeSheet: DesignSheet?
    @State private var showImporter = false
    @State private var importContentTypes: [UTType] = DesignImportService.supportedTypes
    @State private var showExporter = false
    @State private var exportFormat: DesignExportService.ExportFormat = .pdf
    @State private var exportDocument: ExportDocument?
    @State private var showCapabilities = false

    var body: some View {
        VStack(spacing: 0) {
            ModePickerBar()
            Divider()
            Group {
                switch workspace.activeMode {
                case .draw, .coverage, .markup:
                    CanvasWorkspace(project: project, sheet: bindingSheet)
                case .survey:
                    SurveyView(project: project, sheet: bindingSheet)
                case .schematic:
                    SchematicView(project: project, sheet: bindingSheet)
                case .estimate:
                    EstimateView(project: project)
                case .documents:
                    DocumentsView(project: project)
                }
            }
        }
        .navigationTitle(activeSheet?.title ?? project.name)
        .navigationBarTitleDisplayMode(.inline)
        .toolbar { toolbarContent }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: importContentTypes,
            allowsMultipleSelection: false
        ) { result in
            handleImport(result)
        }
        .fileExporter(
            isPresented: $showExporter,
            document: exportDocument,
            contentType: exportFormat.utType,
            defaultFilename: exportFilename
        ) { result in
            switch result {
            case .success(let url):
                workspace.lastExportMessage = "Exported \(url.lastPathComponent)"
            case .failure(let error):
                workspace.lastExportMessage = error.localizedDescription
            }
        }
        .onAppear {
            if activeSheet == nil {
                activeSheet = project.sheets.sorted(by: { $0.sortOrder < $1.sortOrder }).first
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepSelectSheet)) { note in
            if let id = note.object as? UUID {
                activeSheet = project.sheets.first { $0.id == id }
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepImportVisio)) { _ in
            importContentTypes = [.vsdx, .vdx, .xml, .data]
            showImporter = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepImportCAD)) { _ in
            importContentTypes = [.dxf, .dwg, .data]
            showImporter = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepImportPDF)) { _ in
            importContentTypes = [.pdf]
            showImporter = true
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepExportPDF)) { _ in
            prepareExport(.pdf)
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepExportDXF)) { _ in
            prepareExport(.dxf)
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepExportVisio)) { _ in
            prepareExport(.visioXML)
        }
        .overlay(alignment: .bottom) {
            if let msg = workspace.lastImportMessage ?? workspace.lastExportMessage {
                Text(msg)
                    .font(.caption)
                    .padding(10)
                    .background(.ultraThinMaterial, in: Capsule())
                    .padding()
                    .onTapGesture {
                        workspace.lastImportMessage = nil
                        workspace.lastExportMessage = nil
                    }
            }
        }
        .sheet(isPresented: $showCapabilities) {
            IndustryBridgeView()
        }
    }

    private var bindingSheet: DesignSheet? { activeSheet }

    private var exportFilename: String {
        let base = project.name.replacingOccurrences(of: " ", with: "_")
        return "\(base).\(exportFormat.fileExtension)"
    }

    @ToolbarContentBuilder
    private var toolbarContent: some ToolbarContent {
        ToolbarItemGroup(placement: .navigationBarLeading) {
            Menu {
                ForEach(project.sheets.sorted(by: { $0.sortOrder < $1.sortOrder })) { sheet in
                    Button(sheet.title) { activeSheet = sheet }
                }
            } label: {
                Label(activeSheet?.title ?? "Sheets", systemImage: "doc.richtext")
            }
        }
        ToolbarItemGroup(placement: .primaryAction) {
            Menu {
                Button { importContentTypes = DesignImportService.supportedTypes; showImporter = true } label: {
                    Label("Import Visio / CAD / PDF", systemImage: "square.and.arrow.down")
                }
                Divider()
                Button("Export PDF") { prepareExport(.pdf) }
                Button("Export DXF") { prepareExport(.dxf) }
                Button("Export Visio XML") { prepareExport(.visioXML) }
                Button("Export BOM CSV") { prepareExport(.csvBOM) }
            } label: {
                Image(systemName: "square.and.arrow.up.on.square")
            }
            Button { showCapabilities = true } label: {
                Image(systemName: "rectangle.3.group")
            }
            .accessibilityLabel("Industry tools bridge")
        }
    }

    private func handleImport(_ result: Result<[URL], Error>) {
        switch result {
        case .failure(let error):
            workspace.lastImportMessage = error.localizedDescription
        case .success(let urls):
            guard let url = urls.first else { return }
            let accessed = url.startAccessingSecurityScopedResource()
            defer { if accessed { url.stopAccessingSecurityScopedResource() } }
            do {
                let imported = try DesignImportService.importFile(at: url)
                applyImport(imported, fileName: url.lastPathComponent)
            } catch {
                workspace.lastImportMessage = error.localizedDescription
            }
        }
    }

    private func applyImport(_ result: DesignImportService.ImportResult, fileName: String) {
        guard let sheet = activeSheet ?? project.sheets.first else {
            workspace.lastImportMessage = "Create a sheet before importing."
            return
        }
        switch result {
        case .floorPlanBackground(let title, let pageSize, let pageCount):
            sheet.backgroundPDFBookmark = fileName
            sheet.width = max(sheet.width, pageSize.width * 2)
            sheet.height = max(sheet.height, pageSize.height * 2)
            if sheet.title.hasPrefix("Floor Plan") || sheet.title.hasPrefix("Sheet") {
                sheet.title = title
            }
            project.documents.append(ProjectDocument(title: title, kind: .floorPlanPDF, fileName: fileName))
            workspace.lastImportMessage = "PDF “\(fileName)” attached (\(pageCount) page\(pageCount == 1 ? "" : "s"))."

        case .visioStencil(let shapes):
            for shape in shapes {
                let sym = SymbolLibrary.symbol(id: shape.symbolHint)
                let device = PlacedDevice(
                    symbolID: shape.symbolHint,
                    label: shape.name,
                    tag: String(shape.name.prefix(8)).uppercased(),
                    discipline: sym?.discipline ?? .cctv,
                    x: shape.x,
                    y: shape.y
                )
                sheet.devices.append(device)
            }
            project.documents.append(ProjectDocument(title: fileName, kind: .visio, fileName: fileName))
            workspace.lastImportMessage = "Visio: placed \(shapes.count) shape\(shapes.count == 1 ? "" : "s")."

        case .cadEntities(let entities):
            var placed = 0
            for entity in entities {
                if entity.entityType.hasPrefix("INSERT:"), let pt = entity.points.first {
                    let block = String(entity.entityType.dropFirst(7))
                    let symbol = SymbolLibrary.all.first {
                        $0.cadBlock.compare(block, options: .caseInsensitive) == .orderedSame
                    } ?? SymbolLibrary.symbol(id: "cam.dome")!
                    let device = PlacedDevice(
                        symbolID: symbol.id,
                        label: block,
                        tag: block,
                        discipline: symbol.discipline ?? .infrastructure,
                        x: pt.x,
                        y: pt.y
                    )
                    sheet.devices.append(device)
                    placed += 1
                }
            }
            project.documents.append(ProjectDocument(title: fileName, kind: .autocad, fileName: fileName))
            workspace.lastImportMessage = "DXF: \(entities.count) entities, \(placed) blocks placed."

        case .message(let text):
            project.documents.append(ProjectDocument(title: fileName, kind: .autocad, fileName: fileName))
            workspace.lastImportMessage = text
        }
        project.updatedAt = Date()
    }

    private func prepareExport(_ format: DesignExportService.ExportFormat) {
        exportFormat = format
        guard let sheet = activeSheet ?? project.sheets.first else {
            workspace.lastExportMessage = "No sheet to export."
            return
        }
        let data: Data
        switch format {
        case .pdf:
            data = DesignExportService.exportPDF(project: project, sheet: sheet)
        case .dxf:
            data = Data(DesignExportService.exportDXF(sheet: sheet).utf8)
        case .visioXML:
            data = Data(DesignExportService.exportVisioXML(project: project, sheet: sheet).utf8)
        case .csvBOM:
            data = Data(DesignExportService.exportBOMCSV(project: project).utf8)
        case .sepJSON:
            let payload = [
                "name": project.name,
                "client": project.clientName,
                "devices": "\(sheet.devices.count)"
            ]
            data = (try? JSONSerialization.data(withJSONObject: payload, options: .prettyPrinted)) ?? Data()
        }
        exportDocument = ExportDocument(data: data)
        showExporter = true
    }
}

struct ExportDocument: FileDocument {
    static var readableContentTypes: [UTType] { [.pdf, .xml, .plainText, .json, .commaSeparatedText, .data] }
    var data: Data

    init(data: Data) { self.data = data }
    init(configuration: ReadConfiguration) throws {
        data = configuration.file.regularFileContents ?? Data()
    }
    func fileWrapper(configuration: WriteConfiguration) throws -> FileWrapper {
        FileWrapper(regularFileWithContents: data)
    }
}

struct ModePickerBar: View {
    @EnvironmentObject private var workspace: DesignWorkspace

    var body: some View {
        VStack(spacing: 4) {
            Picker("Mode", selection: $workspace.activeMode) {
                ForEach(DesignWorkspace.WorkspaceMode.allCases) { mode in
                    Label(mode.rawValue, systemImage: mode.systemImage).tag(mode)
                }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 16)
            .padding(.top, 8)

            Text(workspace.activeMode.inspiredBy)
                .font(.caption2)
                .foregroundStyle(DesignTheme.muted)
                .padding(.bottom, 6)
        }
        .background(DesignTheme.surfaceSecondary)
    }
}
