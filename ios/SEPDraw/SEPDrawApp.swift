import SwiftUI
import Observation

enum SecurityDiscipline: String, Codable { case video, access, intrusion, infrastructure }

enum DeviceKind: String, Codable, CaseIterable, Identifiable {
    case camera, cardReader, doorContact, panel, `switch`
    var id: String { rawValue }
    var symbol: String {
        switch self {
        case .camera: "video.fill"
        case .cardReader: "rectangle.and.pencil.and.ellipsis"
        case .doorContact: "door.left.hand.open"
        case .panel: "cpu"
        case .switch: "network"
        }
    }
}

struct DeviceProduct: Identifiable, Codable, Hashable {
    var id = UUID()
    var manufacturer: String
    var model: String
    var kind: DeviceKind
    var partNumber: String = ""
    var unitCost: Double = 0
}

struct WorldPoint: Codable, Hashable {
    var x: Double
    var y: Double
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

enum CanvasTool: String, CaseIterable, Identifiable {
    case select, place
    var id: String { rawValue }
}

@Observable final class WorkspaceStore {
    var devices: [PlacedDevice] = []
    var layers = [DrawingLayer(sheetIndex: 0, name: "Security Devices")]
    var activePDFPageIndex = 0
    var activeLayerID: UUID?
    var selectedDeviceID: UUID?
    var activeProduct = DeviceProduct(manufacturer: "Generic", model: "IP Camera", kind: .camera)
    var tool: CanvasTool = .select

    init() { activeLayerID = layers.first?.id }

    func addDevice(at point: CGPoint) {
        guard tool == .place, let layerID = activeLayerID,
              let layer = layers.first(where: { $0.id == layerID }),
              !layer.isLocked else { return }
        let count = devices.filter {
            $0.sheetIndex == activePDFPageIndex && $0.product.kind == activeProduct.kind
        }.count + 1
        devices.append(PlacedDevice(
            product: activeProduct,
            position: .init(x: point.x, y: point.y),
            label: "\(activeProduct.kind.rawValue.capitalized)-\(count)",
            layerID: layerID,
            sheetIndex: activePDFPageIndex
        ))
    }

    func deleteSelected() {
        guard let selectedDeviceID else { return }
        devices.removeAll { $0.id == selectedDeviceID }
        self.selectedDeviceID = nil
    }
}

@main struct SEPDrawApp: App {
    @State private var workspace = WorkspaceStore()
    var body: some Scene { WindowGroup { RootView().environment(workspace) } }
}

struct RootView: View {
    @Environment(WorkspaceStore.self) private var workspace

    var body: some View {
        @Bindable var workspace = workspace
        NavigationSplitView {
            List {
                Section("Device Palette") {
                    ForEach(DeviceKind.allCases) { kind in
                        Button(kind.rawValue.capitalized) {
                            workspace.activeProduct.kind = kind
                            workspace.activeProduct.model = kind.rawValue.capitalized
                            workspace.tool = .place
                        }
                    }
                }
            }
            .navigationTitle("SEP Draw")
        } detail: {
            ZStack {
                Color.white
                Grid(horizontalSpacing: 24, verticalSpacing: 24)
                    .foregroundStyle(.gray.opacity(0.2))
                ForEach(workspace.devices.filter { $0.sheetIndex == workspace.activePDFPageIndex }) { device in
                    Image(systemName: device.product.kind.symbol)
                        .foregroundStyle(device.id == workspace.selectedDeviceID ? Color.red : Color.blue)
                        .font(.title2)
                        .position(x: device.position.x, y: device.position.y)
                        .onTapGesture { workspace.selectedDeviceID = device.id }
                }
            }
            .contentShape(Rectangle())
            .gesture(SpatialTapGesture().onEnded { workspace.addDevice(at: $0.location) })
            .toolbar {
                Picker("Tool", selection: $workspace.tool) {
                    Text("Select").tag(CanvasTool.select)
                    Text("Place").tag(CanvasTool.place)
                }
                .pickerStyle(.segmented)

                Button("Delete", role: .destructive) {
                    workspace.deleteSelected()
                }
                .disabled(workspace.selectedDeviceID == nil)
            }
        }
    }
}
