import SwiftUI
import SwiftData

struct CanvasWorkspace: View {
    @Bindable var project: DesignProject
    var sheet: DesignSheet?
    @EnvironmentObject private var workspace: DesignWorkspace
    @Environment(\.modelContext) private var modelContext

    var body: some View {
        GeometryReader { geo in
            HStack(spacing: 0) {
                if workspace.showLibrary {
                    SymbolLibraryPanel()
                        .frame(width: 280)
                        .background(DesignTheme.surfaceSecondary)
                    Divider()
                }

                ZStack {
                    DesignTheme.surface.ignoresSafeArea()
                    if let sheet {
                        DrawingCanvas(project: project, sheet: sheet)
                    } else {
                        ContentUnavailableView("No Sheet", systemImage: "doc", description: Text("Add a floor plan sheet to start drawing."))
                    }
                }

                if workspace.showLayers, let sheet {
                    Divider()
                    LayersPanel(sheet: sheet)
                        .frame(width: 220)
                        .background(DesignTheme.surfaceSecondary)
                }
            }
            .overlay(alignment: .bottom) {
                ToolPalette()
                    .padding(.bottom, 12)
            }
            .overlay(alignment: .topTrailing) {
                CanvasChromeToggles()
                    .padding(12)
            }
        }
    }
}

struct DrawingCanvas: View {
    @Bindable var project: DesignProject
    @Bindable var sheet: DesignSheet
    @EnvironmentObject private var workspace: DesignWorkspace
    @State private var dragStart: CGPoint?
    @State private var measureEnd: CGPoint?

    var body: some View {
        GeometryReader { proxy in
            ZStack(alignment: .topLeading) {
                // Grid
                if workspace.showGrid {
                    CanvasGrid(size: CGSize(width: sheet.width, height: sheet.height), spacing: 40)
                }

                // PDF / background hint
                if let bg = sheet.backgroundPDFBookmark {
                    RoundedRectangle(cornerRadius: 4)
                        .strokeBorder(DesignTheme.brandAccent.opacity(0.35), style: StrokeStyle(lineWidth: 1, dash: [6, 4]))
                        .frame(width: min(sheet.width, 1200), height: min(sheet.height, 900))
                        .overlay {
                            Text("Background: \(bg)")
                                .font(.caption)
                                .foregroundStyle(DesignTheme.muted)
                        }
                        .padding(40)
                }

                // Coverage zones
                if workspace.showCoverage || workspace.activeMode == .coverage {
                    ForEach(sheet.coverageZones) { zone in
                        CoverageWedge(zone: zone, feetPerUnit: project.scaleFeetPerUnit)
                    }
                }

                // Markups
                if workspace.activeMode == .markup || workspace.selectedTool == .markup {
                    ForEach(sheet.markups) { markup in
                        MarkupView(markup: markup)
                    }
                }

                // Devices
                ForEach(sheet.devices) { device in
                    DeviceNodeView(
                        device: device,
                        selected: workspace.selectedDeviceID == device.id
                    )
                    .position(device.position)
                    .gesture(deviceDrag(device))
                    .onTapGesture { selectOrErase(device) }
                }

                // Measure overlay
                if let start = dragStart, let end = measureEnd, workspace.selectedTool == .measure {
                    Path { p in
                        p.move(to: start)
                        p.addLine(to: end)
                    }
                    .stroke(DesignTheme.brandGold, style: StrokeStyle(lineWidth: 2, dash: [4, 3]))
                    let dist = hypot(end.x - start.x, end.y - start.y) * project.scaleFeetPerUnit
                    Text(String(format: "%.1f ft", dist))
                        .font(.caption.monospacedDigit().weight(.semibold))
                        .padding(6)
                        .background(.ultraThinMaterial, in: Capsule())
                        .position(x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 - 16)
                }
            }
            .frame(width: sheet.width, height: sheet.height)
            .scaleEffect(workspace.canvasZoom, anchor: .topLeading)
            .offset(workspace.canvasOffset)
            .gesture(canvasGesture(in: proxy.size))
            .background(Color.white)
            .clipped()
            .contentShape(Rectangle())
        }
    }

    private func selectOrErase(_ device: PlacedDevice) {
        if workspace.selectedTool == .erase {
            sheet.devices.removeAll { $0.id == device.id }
            sheet.coverageZones.removeAll { $0.deviceID == device.id }
            project.updatedAt = Date()
        } else {
            workspace.selectedDeviceID = device.id
        }
    }

    private func deviceDrag(_ device: PlacedDevice) -> some Gesture {
        DragGesture()
            .onChanged { value in
                guard workspace.selectedTool == .select || workspace.selectedTool == .place else { return }
                guard !isLayerLocked(for: device) else { return }
                device.x = value.location.x
                device.y = value.location.y
            }
            .onEnded { _ in project.updatedAt = Date() }
    }

    private func isLayerLocked(for device: PlacedDevice) -> Bool {
        guard let layerID = device.layerID else { return false }
        return sheet.layers.first(where: { $0.id == layerID })?.isLocked == true
    }

    private func canvasGesture(in size: CGSize) -> some Gesture {
        DragGesture(minimumDistance: 0)
            .onChanged { value in
                let point = canvasPoint(from: value.location)
                switch workspace.selectedTool {
                case .pan:
                    workspace.canvasOffset = CGSize(
                        width: workspace.canvasOffset.width + value.translation.width * 0.05,
                        height: workspace.canvasOffset.height + value.translation.height * 0.05
                    )
                case .measure:
                    if dragStart == nil { dragStart = point }
                    measureEnd = point
                case .place:
                    break
                default:
                    break
                }
            }
            .onEnded { value in
                let point = canvasPoint(from: value.location)
                switch workspace.selectedTool {
                case .place:
                    placeSymbol(at: point)
                case .coverage:
                    addCoverage(at: point)
                case .markup:
                    addMarkup(at: point)
                case .measure:
                    dragStart = nil
                    measureEnd = nil
                default:
                    break
                }
            }
    }

    private func canvasPoint(from viewPoint: CGPoint) -> CGPoint {
        CGPoint(
            x: (viewPoint.x - workspace.canvasOffset.width) / workspace.canvasZoom,
            y: (viewPoint.y - workspace.canvasOffset.height) / workspace.canvasZoom
        )
    }

    private func placeSymbol(at point: CGPoint) {
        guard let symbolID = workspace.selectedSymbolID,
              let symbol = SymbolLibrary.symbol(id: symbolID) else { return }
        let count = sheet.devices.filter { $0.symbolID == symbolID }.count + 1
        let tagPrefix = String(symbol.cadBlock.prefix(3))
        let device = PlacedDevice(
            symbolID: symbolID,
            label: symbol.name,
            tag: "\(tagPrefix)-\(String(format: "%02d", count))",
            discipline: symbol.discipline ?? workspace.selectedDiscipline ?? .infrastructure,
            x: point.x,
            y: point.y
        )
        if let catalog = try? modelContext.fetch(FetchDescriptor<CatalogDevice>()).first(where: { $0.symbolID == symbolID }) {
            device.catalogSKU = catalog.sku
            device.manufacturer = catalog.manufacturer
            device.modelName = catalog.modelName
            device.unitCost = catalog.unitCost
            device.laborHours = catalog.laborHours
        }
        sheet.devices.append(device)
        if symbol.discipline == .cctv {
            sheet.coverageZones.append(CoverageZone(kind: .cameraFOV, originX: point.x, originY: point.y))
        }
        workspace.selectedDeviceID = device.id
        project.updatedAt = Date()
    }

    private func addCoverage(at point: CGPoint) {
        sheet.coverageZones.append(
            CoverageZone(kind: .cameraFOV, originX: point.x, originY: point.y, headingDegrees: 0, fovDegrees: 90, rangeFeet: 40)
        )
        project.updatedAt = Date()
    }

    private func addMarkup(at point: CGPoint) {
        sheet.markups.append(MarkupAnnotation(kind: .cloud, text: "Note", x: point.x, y: point.y))
        project.updatedAt = Date()
    }
}

struct CanvasGrid: View {
    let size: CGSize
    let spacing: CGFloat

    var body: some View {
        Canvas { context, _ in
            var path = Path()
            stride(from: 0.0, through: size.width, by: spacing).forEach { x in
                path.move(to: CGPoint(x: x, y: 0))
                path.addLine(to: CGPoint(x: x, y: size.height))
            }
            stride(from: 0.0, through: size.height, by: spacing).forEach { y in
                path.move(to: CGPoint(x: 0, y: y))
                path.addLine(to: CGPoint(x: size.width, y: y))
            }
            context.stroke(path, with: .color(DesignTheme.canvasGrid), lineWidth: 0.5)
        }
        .frame(width: size.width, height: size.height)
        .allowsHitTesting(false)
    }
}

struct DeviceNodeView: View {
    @Bindable var device: PlacedDevice
    var selected: Bool

    var body: some View {
        VStack(spacing: 2) {
            ZStack {
                Circle()
                    .fill(Color.white)
                    .frame(width: 40, height: 40)
                    .shadow(color: .black.opacity(0.12), radius: selected ? 6 : 2, y: 1)
                Circle()
                    .strokeBorder(device.discipline.color, lineWidth: selected ? 2.5 : 1.5)
                    .frame(width: 40, height: 40)
                SymbolGlyphView(symbolID: device.symbolID, size: 26, tint: device.discipline.color)
            }
            Text(device.tag)
                .font(.system(size: 9, weight: .semibold, design: .monospaced))
                .padding(.horizontal, 4)
                .padding(.vertical, 1)
                .background(DesignTheme.brandTertiary.opacity(0.95), in: Capsule())
        }
        .frame(width: 72, height: 60)
    }
}

struct CoverageWedge: View {
    @Bindable var zone: CoverageZone
    var feetPerUnit: Double

    var body: some View {
        let radius = CGFloat(zone.rangeFeet / max(feetPerUnit, 0.01))
        CoverageShape(heading: zone.headingDegrees, fov: zone.fovDegrees)
            .fill(DesignTheme.layerCCTV.opacity(0.18))
            .overlay(CoverageShape(heading: zone.headingDegrees, fov: zone.fovDegrees).stroke(DesignTheme.layerCCTV.opacity(0.55), lineWidth: 1))
            .frame(width: radius * 2, height: radius * 2)
            .position(x: zone.originX, y: zone.originY)
            .allowsHitTesting(false)
    }
}

struct CoverageShape: Shape {
    var heading: Double
    var fov: Double

    func path(in rect: CGRect) -> Path {
        var path = Path()
        let center = CGPoint(x: rect.midX, y: rect.midY)
        let radius = min(rect.width, rect.height) / 2
        let start = Angle(degrees: heading - fov / 2 - 90)
        let end = Angle(degrees: heading + fov / 2 - 90)
        path.move(to: center)
        path.addArc(center: center, radius: radius, startAngle: start, endAngle: end, clockwise: false)
        path.closeSubpath()
        return path
    }
}

struct MarkupView: View {
    @Bindable var markup: MarkupAnnotation

    var body: some View {
        Text(markup.text)
            .font(.caption)
            .padding(8)
            .background(DesignTheme.brandGold.opacity(0.2))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(DesignTheme.brandGold, style: StrokeStyle(lineWidth: 1.5, dash: markup.kind == .cloud ? [5, 3] : []))
            )
            .position(x: markup.x, y: markup.y)
    }
}

struct ToolPalette: View {
    @EnvironmentObject private var workspace: DesignWorkspace

    var body: some View {
        HStack(spacing: 4) {
            ForEach(DesignTool.allCases) { tool in
                Button {
                    workspace.selectedTool = tool
                    if tool == .place && workspace.selectedSymbolID == nil {
                        workspace.selectedSymbolID = "cam.dome"
                    }
                } label: {
                    VStack(spacing: 2) {
                        Image(systemName: tool.systemImage)
                        Text(tool.label).font(.system(size: 9))
                    }
                    .foregroundStyle(workspace.selectedTool == tool ? DesignTheme.brandNavy : DesignTheme.muted)
                    .frame(width: 56, height: 44)
                    .background(
                        workspace.selectedTool == tool ? DesignTheme.brandTertiary : Color.clear,
                        in: RoundedRectangle(cornerRadius: 8)
                    )
                }
                .buttonStyle(.plain)
            }
        }
        .padding(8)
        .background(.ultraThinMaterial, in: Capsule())
        .shadow(color: .black.opacity(0.08), radius: 8, y: 2)
    }
}

struct CanvasChromeToggles: View {
    @EnvironmentObject private var workspace: DesignWorkspace

    var body: some View {
        HStack(spacing: 8) {
            toggle("grid", "Grid", workspace.showGrid) { workspace.showGrid.toggle() }
            toggle("cone", "FOV", workspace.showCoverage) { workspace.showCoverage.toggle() }
            toggle("square.stack.3d.up", "Lib", workspace.showLibrary) { workspace.showLibrary.toggle() }
            Menu {
                Button("25%") { workspace.canvasZoom = 0.25 }
                Button("50%") { workspace.canvasZoom = 0.5 }
                Button("100%") { workspace.canvasZoom = 1 }
                Button("150%") { workspace.canvasZoom = 1.5 }
                Button("200%") { workspace.canvasZoom = 2 }
            } label: {
                Text("\(Int(workspace.canvasZoom * 100))%")
                    .font(.caption.monospacedDigit())
                    .padding(8)
                    .background(.ultraThinMaterial, in: Capsule())
            }
        }
    }

    private func toggle(_ icon: String, _ label: String, _ on: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Image(systemName: icon)
                .foregroundStyle(on ? DesignTheme.brandNavy : DesignTheme.muted)
                .padding(8)
                .background(.ultraThinMaterial, in: Circle())
        }
        .accessibilityLabel(label)
    }
}
