import SwiftUI
import SwiftData

struct AddLineView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var estimate: ExplorerEstimate
    let rates: [ExplorerLaborRate]

    @State private var descriptionText = ""
    @State private var quantity = "1"
    @State private var unitCost = "0"
    @State private var laborHours = "0"
    @State private var laborRole = "Technician"

    var body: some View {
        NavigationStack {
            Form {
                TextField("Description", text: $descriptionText)
                TextField("Quantity", text: $quantity).keyboardType(.decimalPad)
                TextField("Unit cost", text: $unitCost).keyboardType(.decimalPad)
                TextField("Labor hours", text: $laborHours).keyboardType(.decimalPad)
                Picker("Labor role", selection: $laborRole) {
                    ForEach(roleNames, id: \.self) { Text($0) }
                }
            }
            .navigationTitle("Add Line")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Add") { save() }
                        .disabled(descriptionText.trimmingCharacters(in: .whitespaces).isEmpty)
                }
            }
        }
    }

    private var roleNames: [String] {
        let names = rates.map(\.roleName)
        return names.isEmpty ? ExplorerLaborRate.seedDefaults.map(\.0) : names
    }

    private func rate(for role: String) -> Double {
        rates.first(where: { $0.roleName == role })?.hourlyRate
            ?? ExplorerLaborRate.seedDefaults.first(where: { $0.0 == role })?.1
            ?? 75
    }

    private func save() {
        let line = ExplorerLine(
            descriptionText: descriptionText.trimmingCharacters(in: .whitespaces),
            quantity: Double(quantity) ?? 1,
            unitCost: Double(unitCost) ?? 0,
            laborHours: Double(laborHours) ?? 0,
            laborRole: laborRole,
            laborRate: rate(for: laborRole)
        )
        line.estimate = estimate
        estimate.lines.append(line)
        estimate.updatedAt = Date()
        dismiss()
    }
}

struct PickCatalogView: View {
    @Environment(\.dismiss) private var dismiss
    @Bindable var estimate: ExplorerEstimate
    let catalog: [ExplorerCatalogItem]
    let rates: [ExplorerLaborRate]

    var body: some View {
        NavigationStack {
            List(catalog) { item in
                Button {
                    add(item)
                } label: {
                    VStack(alignment: .leading) {
                        Text(item.displayName).foregroundStyle(ExplorerTheme.onSurface)
                        Text("\(item.category) · \(item.cost.formatted(.currency(code: "USD")))")
                            .font(.caption)
                            .foregroundStyle(ExplorerTheme.muted)
                    }
                }
            }
            .navigationTitle("Pick from catalog")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
            .overlay {
                if catalog.isEmpty {
                    ContentUnavailableView("Catalog empty", systemImage: "cube.box", description: Text("Add equipment in the Catalog tab first."))
                }
            }
        }
    }

    private func add(_ item: ExplorerCatalogItem) {
        let techRate = rates.first(where: { $0.roleName == "Technician" })?.hourlyRate ?? 75
        let line = ExplorerLine(
            descriptionText: item.displayName,
            quantity: 1,
            unitCost: item.cost,
            laborHours: 0,
            laborRole: "Technician",
            laborRate: techRate,
            category: item.category
        )
        line.estimate = estimate
        estimate.lines.append(line)
        estimate.updatedAt = Date()
        dismiss()
    }
}
