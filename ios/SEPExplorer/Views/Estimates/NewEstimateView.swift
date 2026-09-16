import SwiftUI
import SwiftData

struct NewEstimateView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss
    @Query(sort: \ExplorerCustomer.name) private var customers: [ExplorerCustomer]

    @State private var name = ""
    @State private var projectType = "Commercial"
    @State private var customerName = ""
    @State private var site = ""
    @State private var cameras = "0"
    @State private var doors = "0"
    @State private var idsPoints = "0"
    @State private var intercoms = "0"
    @State private var cableRuns = "0"

    private let types = ["Commercial", "Federal", "Union"]

    var body: some View {
        NavigationStack {
            Form {
                Section("Project") {
                    TextField("Project name", text: $name)
                        .accessibilityIdentifier("input-project-name")
                    Picker("Type", selection: $projectType) {
                        ForEach(types, id: \.self) { Text($0) }
                    }
                }
                Section("Customer") {
                    TextField("Customer name", text: $customerName)
                    TextField("Site", text: $site)
                }
                Section("System counts") {
                    countField("Cameras", text: $cameras)
                    countField("Doors", text: $doors)
                    countField("IDS points", text: $idsPoints)
                    countField("Intercoms", text: $intercoms)
                    countField("Cable runs", text: $cableRuns)
                }
            }
            .navigationTitle("New Project")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Create") { create() }
                        .disabled(name.trimmingCharacters(in: .whitespaces).isEmpty)
                        .accessibilityIdentifier("create-project-button")
                }
            }
        }
    }

    private func countField(_ title: String, text: Binding<String>) -> some View {
        HStack {
            Text(title)
            Spacer()
            TextField("0", text: text)
                .keyboardType(.numberPad)
                .multilineTextAlignment(.trailing)
                .frame(width: 80)
        }
    }

    private func create() {
        var customer: ExplorerCustomer?
        let trimmedCustomer = customerName.trimmingCharacters(in: .whitespaces)
        if !trimmedCustomer.isEmpty {
            if let existing = customers.first(where: { $0.name.caseInsensitiveCompare(trimmedCustomer) == .orderedSame }) {
                customer = existing
                if !site.isEmpty { existing.site = site }
            } else {
                let created = ExplorerCustomer(name: trimmedCustomer, site: site)
                context.insert(created)
                customer = created
            }
        }

        let estimate = ExplorerEstimate(name: name.trimmingCharacters(in: .whitespaces), projectType: projectType, customer: customer)
        estimate.cameras = Int(cameras) ?? 0
        estimate.doors = Int(doors) ?? 0
        estimate.idsPoints = Int(idsPoints) ?? 0
        estimate.intercoms = Int(intercoms) ?? 0
        estimate.cableRuns = Int(cableRuns) ?? 0
        context.insert(estimate)
        dismiss()
    }
}
