import SwiftUI
import SwiftData

/// magicplan + System Surveyor inspired site survey workflow.
struct SurveyView: View {
    @Bindable var project: DesignProject
    var sheet: DesignSheet?
    @State private var roomName = ""
    @State private var lengthFt = ""
    @State private var widthFt = ""
    @State private var notes = ""

    var body: some View {
        HStack(spacing: 0) {
            List {
                Section("Site Survey") {
                    Text("Walk the site, capture rooms, and drop devices — inspired by System Surveyor & magicplan.")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                    LabeledContent("Project", value: project.name)
                    LabeledContent("Address", value: project.siteAddress.isEmpty ? "—" : project.siteAddress)
                }
                Section("Add Room (magicplan-style)") {
                    TextField("Room name", text: $roomName)
                    HStack {
                        TextField("Length ft", text: $lengthFt)
                            .keyboardType(.decimalPad)
                        TextField("Width ft", text: $widthFt)
                            .keyboardType(.decimalPad)
                    }
                    TextField("Survey notes", text: $notes, axis: .vertical)
                        .lineLimit(3...6)
                    Button("Add Room Label to Sheet") { addRoom() }
                        .disabled(roomName.isEmpty || sheet == nil)
                }
                Section("Survey Checklist") {
                    checklist("Floor plan imported (PDF / CAD)")
                    checklist("IDS device locations verified")
                    checklist("Door hardware / ACS surveyed")
                    checklist("Camera mounting heights noted")
                    checklist("IDF / MDF pathway documented")
                    checklist("Photos filed in Documents")
                }
            }
            .frame(maxWidth: 420)

            Divider()

            if let sheet {
                DrawingCanvas(project: project, sheet: sheet)
            } else {
                ContentUnavailableView("No Sheet", systemImage: "map")
            }
        }
    }

    private func checklist(_ title: String) -> some View {
        Label(title, systemImage: "checkmark.circle")
            .foregroundStyle(DesignTheme.muted)
    }

    private func addRoom() {
        guard let sheet else { return }
        let label = PlacedDevice(
            symbolID: "ann.room",
            label: roomName,
            tag: String(roomName.uppercased().prefix(6)),
            discipline: .infrastructure,
            x: 200 + Double(sheet.devices.count * 30),
            y: 160
        )
        let l = Double(lengthFt) ?? 0
        let w = Double(widthFt) ?? 0
        label.notes = "\(l) × \(w) ft. \(notes)"
        sheet.devices.append(label)
        sheet.markups.append(MarkupAnnotation(
            kind: .callout,
            text: "\(roomName): \(Int(l))×\(Int(w)) ft",
            x: label.x,
            y: label.y + 40
        ))
        project.updatedAt = Date()
        roomName = ""; lengthFt = ""; widthFt = ""; notes = ""
    }
}

/// ConnectCAD + XTEN-AV style schematic / riser.
struct SchematicView: View {
    @Bindable var project: DesignProject
    var sheet: DesignSheet?

    var body: some View {
        VStack(spacing: 0) {
            HStack {
                Text("Schematic / Riser")
                    .font(.headline)
                Spacer()
                Text("Vectorworks ConnectCAD · XTEN-AV · D-Tools")
                    .font(.caption)
                    .foregroundStyle(DesignTheme.muted)
            }
            .padding()

            if let sheet {
                ScrollView([.horizontal, .vertical]) {
                    ZStack(alignment: .topLeading) {
                        SchematicGrid()
                        ForEach(Array(schematicDevices(from: sheet).enumerated()), id: \.element.id) { index, device in
                            SchematicCard(device: device)
                                .position(x: 140 + CGFloat(index % 4) * 200, y: 100 + CGFloat(index / 4) * 140)
                        }
                        // Cable runs between controllers and field devices
                        ForEach(connectionPairs(from: sheet), id: \.0.id) { pair in
                            Path { path in
                                path.move(to: CGPoint(x: 140, y: 100))
                                path.addLine(to: CGPoint(x: 340, y: 100))
                            }
                            .stroke(DesignTheme.brandAccent.opacity(0.4), style: StrokeStyle(lineWidth: 2, dash: [6, 4]))
                            .opacity(pair.0.id == pair.1.id ? 0 : 1)
                        }
                    }
                    .frame(width: 900, height: 700)
                    .padding()
                }
            } else {
                ContentUnavailableView("Open a sheet to build schematics", systemImage: "point.3.connected.trianglepath.dotted")
            }
        }
        .background(DesignTheme.surface)
    }

    private func schematicDevices(from sheet: DesignSheet) -> [PlacedDevice] {
        sheet.devices.sorted { $0.tag < $1.tag }
    }

    private func connectionPairs(from sheet: DesignSheet) -> [(PlacedDevice, PlacedDevice)] {
        let controllers = sheet.devices.filter {
            $0.symbolID.contains("controller") || $0.symbolID.contains("panel") || $0.symbolID.contains("nvr") || $0.symbolID.contains("switch")
        }
        let field = sheet.devices.filter { !controllers.contains(where: { $0.id == $1.id }) }
        guard let c = controllers.first, let f = field.first else { return [] }
        return [(c, f)]
    }
}

struct SchematicCard: View {
    let device: PlacedDevice

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                SymbolGlyphView(symbolID: device.symbolID, size: 28, tint: device.discipline.color)
                VStack(alignment: .leading) {
                    Text(device.tag).font(.caption.monospaced().weight(.bold))
                    Text(device.label).font(.caption2).lineLimit(1)
                }
            }
            Divider()
            Text("Ports: PWR · DATA · ALARM")
                .font(.system(size: 9, design: .monospaced))
                .foregroundStyle(DesignTheme.muted)
        }
        .padding(10)
        .frame(width: 160)
        .background(Color.white, in: RoundedRectangle(cornerRadius: 8))
        .overlay(RoundedRectangle(cornerRadius: 8).stroke(device.discipline.color.opacity(0.5)))
        .shadow(color: .black.opacity(0.06), radius: 4, y: 2)
    }
}

struct SchematicGrid: View {
    var body: some View {
        Canvas { context, size in
            var path = Path()
            for x in stride(from: 0.0, through: size.width, by: 20) {
                path.move(to: CGPoint(x: x, y: 0)); path.addLine(to: CGPoint(x: x, y: size.height))
            }
            for y in stride(from: 0.0, through: size.height, by: 20) {
                path.move(to: CGPoint(x: 0, y: y)); path.addLine(to: CGPoint(x: size.width, y: y))
            }
            context.stroke(path, with: .color(DesignTheme.canvasGrid), lineWidth: 0.5)
        }
        .frame(width: 900, height: 700)
    }
}
