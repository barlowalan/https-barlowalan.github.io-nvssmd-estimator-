import SwiftUI
import SwiftData

struct NewProjectSheet: View {
    @Environment(\.modelContext) private var modelContext
    @Environment(\.dismiss) private var dismiss
    @State private var name = ""
    @State private var client = ""
    @State private var address = ""
    @State private var createFloorPlan = true
    var onCreate: (DesignProject) -> Void

    var body: some View {
        NavigationStack {
            Form {
                Section("Project") {
                    TextField("Project name", text: $name)
                    TextField("Client", text: $client)
                    TextField("Site address", text: $address)
                }
                Section("Start with") {
                    Toggle("Floor plan sheet", isOn: $createFloorPlan)
                    Text("You can import Visio, AutoCAD DXF/DWG, or PDF under Documents / Import.")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                }
            }
            .navigationTitle("New Design Project")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { create() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    private func create() {
        let project = DesignProject(name: name, clientName: client, siteAddress: address)
        if createFloorPlan {
            let sheet = DesignSheet(title: "Floor Plan 1", sheetType: .floorPlan)
            for (i, d) in SystemDiscipline.allCases.enumerated() {
                sheet.layers.append(DesignLayer(name: d.rawValue, discipline: d, sortOrder: i))
            }
            project.sheets = [sheet]
        }
        modelContext.insert(project)
        try? modelContext.save()
        onCreate(project)
        dismiss()
    }
}

struct SheetBrowser: View {
    @Bindable var project: DesignProject
    @State private var selectedSheetID: UUID?

    var body: some View {
        List {
            Section {
                LabeledContent("Client", value: project.clientName.isEmpty ? "—" : project.clientName)
                LabeledContent("Site", value: project.siteAddress.isEmpty ? "—" : project.siteAddress)
                Picker("Status", selection: $project.status) {
                    ForEach(ProjectStatus.allCases, id: \.self) { Text($0.rawValue).tag($0) }
                }
            } header: {
                Text(project.name)
            }

            Section("Sheets") {
                ForEach(project.sheets.sorted(by: { $0.sortOrder < $1.sortOrder })) { sheet in
                    NavigationLink {
                        // Selection handled by parent detail via environment / binding pattern:
                        Text(sheet.title)
                    } label: {
                        HStack {
                            Image(systemName: sheetIcon(sheet.sheetType))
                                .foregroundStyle(DesignTheme.brandAccent)
                            VStack(alignment: .leading) {
                                Text(sheet.title)
                                Text("\(sheet.devices.count) devices · \(sheet.sheetType.rawValue)")
                                    .font(.caption2)
                                    .foregroundStyle(DesignTheme.muted)
                            }
                        }
                    }
                    .simultaneousGesture(TapGesture().onEnded {
                        selectedSheetID = sheet.id
                        NotificationCenter.default.post(name: .sepSelectSheet, object: sheet.id)
                    })
                }
                Button {
                    addSheet()
                } label: {
                    Label("Add Sheet", systemImage: "plus")
                }
            }

            Section("Quick Counts") {
                deviceCountRow(.cctv)
                deviceCountRow(.access)
                deviceCountRow(.ids)
                deviceCountRow(.infrastructure)
            }
        }
        .navigationTitle("Project")
        .navigationBarTitleDisplayMode(.inline)
    }

    private func deviceCountRow(_ d: SystemDiscipline) -> some View {
        let count = project.sheets.reduce(0) { $0 + $1.devices.filter { $0.discipline == d }.count }
        return HStack {
            Image(systemName: d.symbolName).foregroundStyle(d.color)
            Text(d.rawValue)
            Spacer()
            Text("\(count)").foregroundStyle(DesignTheme.muted)
        }
    }

    private func sheetIcon(_ type: SheetType) -> String {
        switch type {
        case .floorPlan, .sitePlan: return "square.grid.3x3"
        case .schematic, .riser: return "point.3.connected.trianglepath.dotted"
        case .coverage: return "cone"
        case .detail: return "magnifyingglass"
        }
    }

    private func addSheet() {
        let sheet = DesignSheet(title: "Sheet \(project.sheets.count + 1)", sheetType: .floorPlan)
        sheet.sortOrder = project.sheets.count
        project.sheets.append(sheet)
        project.updatedAt = Date()
    }
}

extension Notification.Name {
    static let sepSelectSheet = Notification.Name("sep.design.selectSheet")
}
