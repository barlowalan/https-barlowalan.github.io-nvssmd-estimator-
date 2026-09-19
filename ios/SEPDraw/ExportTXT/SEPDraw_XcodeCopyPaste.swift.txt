import SwiftUI
import Observation
import PDFKit
import UniformTypeIdentifiers

enum SecurityDiscipline: String, Codable, CaseIterable, Identifiable {
    case video, access, intrusion, infrastructure
    var id: String { rawValue }
}

enum DeviceKind: String, Codable, CaseIterable, Identifiable {
    case camera, cardReader, doorContact, panel, networkSwitch
    var id: String { rawValue }

    var title: String {
        switch self {
        case .camera: "Camera"
        case .cardReader: "Card Reader"
        case .doorContact: "Door Contact"
        case .panel: "Panel"
        case .networkSwitch: "Switch"
        }
    }

    var symbol: String {
        switch self {
        case .camera: "video.fill"
        case .cardReader: "rectangle.and.pencil.and.ellipsis"
        case .doorContact: "door.left.hand.open"
        case .panel: "cpu"
        case .networkSwitch: "network"
        }
    }

    var discipline: SecurityDiscipline {
        switch self {
        case .camera: .video
        case .cardReader, .doorContact: .access
        case .panel: .intrusion
        case .networkSwitch: .infrastructure
        }
    }
}

struct DeviceProduct: Identifiable, Codable, Hashable {
    var id = UUID()
    var manufacturer: String
    var model: String
    var kind: DeviceKind
    var partNumber = ""
    var unitCost = 0.0
}

struct WorldPoint: Codable, Hashable {
    var x: Double
    var y: Double

    init(x: Double, y: Double) {
        self.x = x
        self.y = y
    }

    init(_ point: CGPoint) {
        x = point.x
        y = point.y
    }

    var cgPoint: CGPoint { CGPoint(x: x, y: y) }
}

struct PlacedDevice: Identifiable, Codable, Hashable {
    var id = UUID()
    var product: DeviceProduct
    var position: WorldPoint
    var label: String
    var layerID: UUID
    var sheetIndex: Int
}

struct DrawingLayer: Identifiable, Codable, Hashable {
    var id = UUID()
    var sheetIndex: Int
    var name: String
    var isVisible = true
    var isLocked = false
}

struct SheetCalibration: Identifiable, Codable, Hashable {
    var id = UUID()
    var sheetIndex: Int
    var firstPoint: WorldPoint
    var secondPoint: WorldPoint
    var knownDistanceFeet: Double

    var pixelsPerFoot: Double {
        let pixels = hypot(
            secondPoint.x - firstPoint.x,
            secondPoint.y - firstPoint.y
        )
        return knownDistanceFeet > 0 ? pixels / knownDistanceFeet : 0
    }
}

struct CableRoute: Identifiable, Codable, Hashable {
    var id = UUID()
    var sheetIndex: Int
    var layerID: UUID
    var start: WorldPoint
    var end: WorldPoint
    var cableType: String

    var pixelLength: Double {
        hypot(end.x - start.x, end.y - start.y)
    }
}

struct DrawingRevision: Identifiable, Codable, Hashable {
    var id = UUID()
    var number: Int
    var note: String
    var createdAt: Date
    var deviceCount: Int
    var routeCount: Int
}

struct BOMRow: Identifiable, Hashable {
    let id: String
    let description: String
    let partNumber: String
    let quantity: Int
    let unitCost: Double
    var extendedCost: Double { Double(quantity) * unitCost }
}

enum CanvasTool: String, CaseIterable, Identifiable {
    case select, place, calibrate, route
    var id: String { rawValue }
    var title: String { rawValue.capitalized }
}

@Observable final class WorkspaceStore {
    var devices: [PlacedDevice] = []
    var layers = [DrawingLayer(sheetIndex: 0, name: "Security Devices")]
    var calibrations: [SheetCalibration] = []
    var routes: [CableRoute] = []
    var revisions: [DrawingRevision] = []

    var activePDFPageIndex = 0
    var activeLayerID: UUID?
    var selectedDeviceID: UUID?
    var activeProduct = DeviceProduct(
        manufacturer: "Generic",
        model: "IP Camera",
        kind: .camera
    )
    var tool: CanvasTool = .select
    var calibrationDistanceFeet = 10.0
    var pendingCalibrationPoint: WorldPoint?
    var pendingRoutePoint: WorldPoint?
    var cableType = "Cat6"
    var revisionNote = "Design update"
    var pdfName: String?
    var errorMessage: String?

    @ObservationIgnored var pdfDocument: PDFDocument?

    init() {
        activeLayerID = layers.first?.id
    }

    var pageCount: Int { max(pdfDocument?.pageCount ?? 1, 1) }

    var visibleDevices: [PlacedDevice] {
        devices.filter { device in
            device.sheetIndex == activePDFPageIndex &&
            layers.first(where: { $0.id == device.layerID })?.isVisible != false
        }
    }

    var visibleRoutes: [CableRoute] {
        routes.filter { route in
            route.sheetIndex == activePDFPageIndex &&
            layers.first(where: { $0.id == route.layerID })?.isVisible != false
        }
    }

    var activeCalibration: SheetCalibration? {
        calibrations.first { $0.sheetIndex == activePDFPageIndex }
    }

    var bomRows: [BOMRow] {
        let groups = Dictionary(grouping: devices) { device in
            [
                device.product.kind.rawValue,
                device.product.manufacturer,
                device.product.model,
                device.product.partNumber
            ].joined(separator: "|")
        }

        return groups.map { key, values in
            let product = values[0].product
            return BOMRow(
                id: key,
                description: "\(product.manufacturer) \(product.model)",
                partNumber: product.partNumber,
                quantity: values.count,
                unitCost: product.unitCost
            )
        }
        .sorted { $0.description < $1.description }
    }

    var bomTotal: Double {
        bomRows.reduce(0) { $0 + $1.extendedCost }
    }

    var totalCableFeet: Double {
        routes.reduce(0) { total, route in
            guard let scale = calibrations.first(where: {
                $0.sheetIndex == route.sheetIndex
            })?.pixelsPerFoot, scale > 0 else { return total }
            return total + route.pixelLength / scale
        }
    }

    func selectProduct(_ kind: DeviceKind) {
        activeProduct = DeviceProduct(
            manufacturer: "Generic",
            model: kind.title,
            kind: kind
        )
        tool = .place
    }

    func handleCanvasTap(_ point: CGPoint) {
        switch tool {
        case .select: selectedDeviceID = nil
        case .place: addDevice(at: point)
        case .calibrate: addCalibrationPoint(point)
        case .route: addRoutePoint(point)
        }
    }

    func addDevice(at point: CGPoint) {
        guard let layer = activeEditableLayer else { return }
        let count = devices.filter {
            $0.sheetIndex == activePDFPageIndex &&
            $0.product.kind == activeProduct.kind
        }.count + 1

        devices.append(
            PlacedDevice(
                product: activeProduct,
                position: WorldPoint(point),
                label: "\(activeProduct.kind.title)-\(count)",
                layerID: layer.id,
                sheetIndex: activePDFPageIndex
            )
        )
    }

    func addCalibrationPoint(_ point: CGPoint) {
        let worldPoint = WorldPoint(point)
        guard let first = pendingCalibrationPoint else {
            pendingCalibrationPoint = worldPoint
            return
        }

        calibrations.removeAll { $0.sheetIndex == activePDFPageIndex }
        calibrations.append(
            SheetCalibration(
                sheetIndex: activePDFPageIndex,
                firstPoint: first,
                secondPoint: worldPoint,
                knownDistanceFeet: calibrationDistanceFeet
            )
        )
        pendingCalibrationPoint = nil
        tool = .select
    }

    func addRoutePoint(_ point: CGPoint) {
        guard let layer = activeEditableLayer else { return }
        let worldPoint = WorldPoint(point)
        guard let first = pendingRoutePoint else {
            pendingRoutePoint = worldPoint
            return
        }

        routes.append(
            CableRoute(
                sheetIndex: activePDFPageIndex,
                layerID: layer.id,
                start: first,
                end: worldPoint,
                cableType: cableType
            )
        )
        pendingRoutePoint = nil
    }

    func routeLengthFeet(_ route: CableRoute) -> Double? {
        guard let scale = calibrations.first(where: {
            $0.sheetIndex == route.sheetIndex
        })?.pixelsPerFoot, scale > 0 else { return nil }
        return route.pixelLength / scale
    }

    func deleteSelectedDevice() {
        guard let selectedDeviceID,
              let device = devices.first(where: { $0.id == selectedDeviceID }),
              layers.first(where: { $0.id == device.layerID })?.isLocked == false
        else { return }

        devices.removeAll { $0.id == selectedDeviceID }
        self.selectedDeviceID = nil
    }

    func addLayer() {
        let layer = DrawingLayer(
            sheetIndex: activePDFPageIndex,
            name: "Layer \(layers.filter { $0.sheetIndex == activePDFPageIndex }.count + 1)"
        )
        layers.append(layer)
        activeLayerID = layer.id
    }

    func ensureLayerForActiveSheet() {
        if let first = layers.first(where: { $0.sheetIndex == activePDFPageIndex }) {
            activeLayerID = first.id
        } else {
            let layer = DrawingLayer(
                sheetIndex: activePDFPageIndex,
                name: "Security Devices"
            )
            layers.append(layer)
            activeLayerID = layer.id
        }
        selectedDeviceID = nil
        pendingCalibrationPoint = nil
        pendingRoutePoint = nil
    }

    func createRevision() {
        revisions.append(
            DrawingRevision(
                number: (revisions.last?.number ?? 0) + 1,
                note: revisionNote,
                createdAt: .now,
                deviceCount: devices.count,
                routeCount: routes.count
            )
        )
    }

    func importPDF(from url: URL) {
        let accessGranted = url.startAccessingSecurityScopedResource()
        defer {
            if accessGranted { url.stopAccessingSecurityScopedResource() }
        }

        do {
            let data = try Data(contentsOf: url)
            guard let document = PDFDocument(data: data) else {
                throw CocoaError(.fileReadCorruptFile)
            }
            pdfDocument = document
            pdfName = url.lastPathComponent
            activePDFPageIndex = 0
            ensureLayerForActiveSheet()
        } catch {
            errorMessage = error.localizedDescription
        }
    }

    private var activeEditableLayer: DrawingLayer? {
        guard let activeLayerID,
              let layer = layers.first(where: { $0.id == activeLayerID }),
              layer.sheetIndex == activePDFPageIndex,
              layer.isVisible,
              !layer.isLocked else { return nil }
        return layer
    }
}

@main struct SEPDrawApp: App {
    @State private var workspace = WorkspaceStore()

    var body: some Scene {
        WindowGroup {
            RootView().environment(workspace)
        }
    }
}

struct RootView: View {
    @Environment(WorkspaceStore.self) private var workspace
    @State private var isImportingPDF = false
    @State private var showsInspector = true

    var body: some View {
        @Bindable var workspace = workspace

        NavigationSplitView {
            List {
                Section("Device Palette") {
                    ForEach(DeviceKind.allCases) { kind in
                        Button {
                            workspace.selectProduct(kind)
                        } label: {
                            Label(kind.title, systemImage: kind.symbol)
                        }
                    }
                }

                Section("Sheet") {
                    LabeledContent("PDF", value: workspace.pdfName ?? "Grid only")
                    Stepper(
                        "Page \(workspace.activePDFPageIndex + 1) of \(workspace.pageCount)",
                        value: $workspace.activePDFPageIndex,
                        in: 0...max(workspace.pageCount - 1, 0)
                    )
                    .onChange(of: workspace.activePDFPageIndex) {
                        workspace.ensureLayerForActiveSheet()
                    }
                }

                Section("Layers") {
                    ForEach($workspace.layers) { $layer in
                        if layer.sheetIndex == workspace.activePDFPageIndex {
                            HStack {
                                Button {
                                    workspace.activeLayerID = layer.id
                                } label: {
                                    Image(systemName: workspace.activeLayerID == layer.id
                                          ? "checkmark.circle.fill" : "circle")
                                }
                                .buttonStyle(.plain)

                                TextField("Layer", text: $layer.name)
                                Toggle("Visible", isOn: $layer.isVisible)
                                    .labelsHidden()
                                Button {
                                    layer.isLocked.toggle()
                                } label: {
                                    Image(systemName: layer.isLocked ? "lock.fill" : "lock.open")
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }

                    Button("Add Layer", systemImage: "plus") {
                        workspace.addLayer()
                    }
                }
            }
            .navigationTitle("SEP Draw")
        } detail: {
            DrawingCanvasView()
                .environment(workspace)
                .navigationTitle(workspace.pdfName ?? "Untitled Drawing")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItemGroup(placement: .topBarLeading) {
                        Button("Import PDF", systemImage: "doc.badge.plus") {
                            isImportingPDF = true
                        }
                        Button("Inspector", systemImage: "sidebar.right") {
                            showsInspector.toggle()
                        }
                    }

                    ToolbarItem(placement: .principal) {
                        Picker("Tool", selection: $workspace.tool) {
                            ForEach(CanvasTool.allCases) { tool in
                                Text(tool.title).tag(tool)
                            }
                        }
                        .pickerStyle(.segmented)
                        .frame(maxWidth: 420)
                    }

                    ToolbarItem(placement: .topBarTrailing) {
                        Button("Delete Device", systemImage: "trash", role: .destructive) {
                            workspace.deleteSelectedDevice()
                        }
                        .disabled(workspace.selectedDeviceID == nil)
                    }
                }
                .inspector(isPresented: $showsInspector) {
                    InspectorView()
                        .environment(workspace)
                        .inspectorColumnWidth(min: 280, ideal: 340, max: 420)
                }
        }
        .fileImporter(
            isPresented: $isImportingPDF,
            allowedContentTypes: [.pdf]
        ) { result in
            switch result {
            case .success(let url): workspace.importPDF(from: url)
            case .failure(let error): workspace.errorMessage = error.localizedDescription
            }
        }
        .alert(
            "Unable to Import PDF",
            isPresented: Binding(
                get: { workspace.errorMessage != nil },
                set: { if !$0 { workspace.errorMessage = nil } }
            )
        ) {
            Button("OK", role: .cancel) { workspace.errorMessage = nil }
        } message: {
            Text(workspace.errorMessage ?? "Unknown error")
        }
    }
}

struct DrawingCanvasView: View {
    @Environment(WorkspaceStore.self) private var workspace

    var body: some View {
        ZStack {
            Color.white

            if let document = workspace.pdfDocument {
                PDFPageView(
                    document: document,
                    pageIndex: workspace.activePDFPageIndex
                )
                .allowsHitTesting(false)
            } else {
                Canvas { context, size in
                    var grid = Path()
                    stride(from: 0.0, through: size.width, by: 24).forEach { x in
                        grid.move(to: CGPoint(x: x, y: 0))
                        grid.addLine(to: CGPoint(x: x, y: size.height))
                    }
                    stride(from: 0.0, through: size.height, by: 24).forEach { y in
                        grid.move(to: CGPoint(x: 0, y: y))
                        grid.addLine(to: CGPoint(x: size.width, y: y))
                    }
                    context.stroke(
                        grid,
                        with: .color(.gray.opacity(0.18)),
                        lineWidth: 0.5
                    )
                }
            }

            routeOverlay
            calibrationOverlay
            deviceOverlay
        }
        .contentShape(Rectangle())
        .gesture(
            SpatialTapGesture().onEnded {
                workspace.handleCanvasTap($0.location)
            }
        )
        .overlay(alignment: .bottomLeading) {
            statusPill.padding()
        }
    }

    private var routeOverlay: some View {
        Canvas { context, _ in
            for route in workspace.visibleRoutes {
                var path = Path()
                path.move(to: route.start.cgPoint)
                path.addLine(to: route.end.cgPoint)
                context.stroke(
                    path,
                    with: .color(.orange),
                    style: StrokeStyle(lineWidth: 3, lineCap: .round, dash: [8, 5])
                )
            }

            if let start = workspace.pendingRoutePoint {
                let rect = CGRect(x: start.x - 5, y: start.y - 5, width: 10, height: 10)
                context.fill(Path(ellipseIn: rect), with: .color(.orange))
            }
        }
        .allowsHitTesting(false)
    }

    private var calibrationOverlay: some View {
        Canvas { context, _ in
            if let calibration = workspace.activeCalibration {
                var path = Path()
                path.move(to: calibration.firstPoint.cgPoint)
                path.addLine(to: calibration.secondPoint.cgPoint)
                context.stroke(
                    path,
                    with: .color(.purple),
                    style: StrokeStyle(lineWidth: 2, dash: [5, 4])
                )
            }

            if let first = workspace.pendingCalibrationPoint {
                let rect = CGRect(x: first.x - 5, y: first.y - 5, width: 10, height: 10)
                context.fill(Path(ellipseIn: rect), with: .color(.purple))
            }
        }
        .allowsHitTesting(false)
    }

    private var deviceOverlay: some View {
        ForEach(workspace.visibleDevices) { device in
            VStack(spacing: 2) {
                Image(systemName: device.product.kind.symbol)
                    .font(.title2)
                Text(device.label)
                    .font(.caption2)
                    .fixedSize()
            }
            .foregroundStyle(workspace.selectedDeviceID == device.id ? .red : .blue)
            .padding(6)
            .background(.thinMaterial, in: RoundedRectangle(cornerRadius: 8))
            .overlay {
                if workspace.selectedDeviceID == device.id {
                    RoundedRectangle(cornerRadius: 8).stroke(.red, lineWidth: 2)
                }
            }
            .position(device.position.cgPoint)
            .onTapGesture {
                guard workspace.tool == .select else { return }
                workspace.selectedDeviceID = device.id
            }
        }
    }

    private var statusPill: some View {
        HStack(spacing: 10) {
            Label("Sheet \(workspace.activePDFPageIndex + 1)", systemImage: "doc")
            if let calibration = workspace.activeCalibration {
                Text("Scale: \(calibration.knownDistanceFeet.formatted()) ft")
            } else {
                Text("Not calibrated").foregroundStyle(.secondary)
            }
            Text("Cable: \(workspace.totalCableFeet.formatted(.number.precision(.fractionLength(1)))) ft")
        }
        .font(.caption)
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(.regularMaterial, in: Capsule())
    }
}

struct InspectorView: View {
    @Environment(WorkspaceStore.self) private var workspace

    var body: some View {
        @Bindable var workspace = workspace

        Form {
            Section("Calibration") {
                TextField(
                    "Known distance",
                    value: $workspace.calibrationDistanceFeet,
                    format: .number
                )
                .keyboardType(.decimalPad)
                LabeledContent("Units", value: "Feet")
                Button("Calibrate With Two Points", systemImage: "ruler") {
                    workspace.pendingCalibrationPoint = nil
                    workspace.tool = .calibrate
                }
            }

            Section("Cable Routing") {
                TextField("Cable type", text: $workspace.cableType)
                Button(
                    "Start Two-Point Route",
                    systemImage: "point.topleft.down.to.point.bottomright.curvepath"
                ) {
                    workspace.pendingRoutePoint = nil
                    workspace.tool = .route
                }

                ForEach(workspace.visibleRoutes) { route in
                    LabeledContent(route.cableType) {
                        if let feet = workspace.routeLengthFeet(route) {
                            Text("\(feet.formatted(.number.precision(.fractionLength(1)))) ft")
                        } else {
                            Text("Needs scale").foregroundStyle(.secondary)
                        }
                    }
                }
            }

            Section("Live BOM") {
                if workspace.bomRows.isEmpty {
                    ContentUnavailableView(
                        "No Devices",
                        systemImage: "shippingbox",
                        description: Text("Placed devices appear here automatically.")
                    )
                } else {
                    ForEach(workspace.bomRows) { row in
                        VStack(alignment: .leading, spacing: 3) {
                            HStack {
                                Text(row.description)
                                Spacer()
                                Text("× \(row.quantity)")
                            }
                            HStack {
                                Text(row.partNumber.isEmpty ? "No part number" : row.partNumber)
                                    .foregroundStyle(.secondary)
                                Spacer()
                                Text(row.extendedCost, format: .currency(code: "USD"))
                            }
                            .font(.caption)
                        }
                    }

                    LabeledContent(
                        "Equipment Total",
                        value: workspace.bomTotal.formatted(.currency(code: "USD"))
                    )
                    LabeledContent(
                        "Cable Takeoff",
                        value: "\(workspace.totalCableFeet.formatted(.number.precision(.fractionLength(1)))) ft"
                    )
                }
            }

            Section("Revisions") {
                TextField("Revision note", text: $workspace.revisionNote)
                Button("Create Revision", systemImage: "clock.arrow.circlepath") {
                    workspace.createRevision()
                }

                ForEach(workspace.revisions.reversed()) { revision in
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Revision \(revision.number): \(revision.note)")
                        Text("\(revision.deviceCount) devices • \(revision.routeCount) routes • \(revision.createdAt.formatted(date: .abbreviated, time: .shortened))")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .navigationTitle("Drawing Inspector")
    }
}

struct PDFPageView: UIViewRepresentable {
    let document: PDFDocument
    let pageIndex: Int

    func makeUIView(context: Context) -> PDFView {
        let view = PDFView()
        view.displayMode = .singlePage
        view.displayDirection = .vertical
        view.autoScales = true
        view.backgroundColor = .white
        return view
    }

    func updateUIView(_ view: PDFView, context: Context) {
        if view.document !== document {
            view.document = document
        }
        let safeIndex = min(max(pageIndex, 0), max(document.pageCount - 1, 0))
        if let page = document.page(at: safeIndex) {
            view.go(to: page)
        }
    }
}
