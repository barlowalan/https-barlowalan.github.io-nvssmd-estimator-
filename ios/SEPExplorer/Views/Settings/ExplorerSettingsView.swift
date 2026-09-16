import SwiftUI
import SwiftData

struct ExplorerSettingsView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \ExplorerLaborRate.sortOrder) private var rates: [ExplorerLaborRate]

    @State private var showAddLabor = false
    @State private var newRole = ""
    @State private var newRate = ""
    @State private var limitAlert = false
    @State private var seeded = false

    var body: some View {
        NavigationStack {
            List {
                Section {
                    VStack(alignment: .leading, spacing: 8) {
                        Text("SEP EXPLORER")
                            .font(.caption.weight(.bold))
                            .tracking(1.2)
                            .foregroundStyle(ExplorerTheme.brandPrimary)
                        Text("\(ExplorerPolicy.tier) · \(ExplorerPolicy.price)")
                            .font(.title2.bold())
                        Text("On-site estimating for security contractors. Limits keep the free tier focused.")
                            .font(.subheadline)
                            .foregroundStyle(ExplorerTheme.muted)
                    }
                    .padding(.vertical, 4)
                }

                Section("Tier limits") {
                    LabeledContent("Active projects", value: "\(ExplorerPolicy.activeProjectLimit)")
                    LabeledContent("Catalog records", value: "\(ExplorerPolicy.catalogRecordLimit)")
                    LabeledContent("Labor records", value: "\(ExplorerPolicy.laborRecordLimit)")
                }

                Section("Not included in Explorer") {
                    Label("Drawing / coverage layouts", systemImage: ExplorerPolicy.includesDrawing ? "checkmark.circle" : "xmark.circle")
                    Label("Project management", systemImage: ExplorerPolicy.includesProjectManagement ? "checkmark.circle" : "xmark.circle")
                    Label("Finance / invoicing", systemImage: ExplorerPolicy.includesFinance ? "checkmark.circle" : "xmark.circle")
                }
                .foregroundStyle(ExplorerTheme.muted)

                Section {
                    ForEach(rates) { rate in
                        HStack {
                            Text(rate.roleName)
                            Spacer()
                            TextField(
                                "Rate",
                                value: Binding(
                                    get: { rate.hourlyRate },
                                    set: { rate.hourlyRate = $0 }
                                ),
                                format: .currency(code: "USD")
                            )
                            .keyboardType(.decimalPad)
                            .multilineTextAlignment(.trailing)
                            .frame(width: 110)
                            Text("/hr")
                                .foregroundStyle(ExplorerTheme.muted)
                        }
                        .accessibilityIdentifier("rate-\(rate.roleName)")
                    }
                    .onDelete(perform: deleteRates)

                    Button {
                        if ExplorerPolicy.canCreateLaborRecord(count: rates.count) {
                            showAddLabor = true
                        } else {
                            limitAlert = true
                        }
                    } label: {
                        Label("Add labor role", systemImage: "plus")
                    }
                } header: {
                    Text("Labor rates (\(rates.count)/\(ExplorerPolicy.laborRecordLimit))")
                } footer: {
                    Text("Hourly rates power every estimate line. Update once — all projects recalculate.")
                }
            }
            .navigationTitle("Settings")
            .onAppear(perform: seedIfNeeded)
            .alert("Add labor role", isPresented: $showAddLabor) {
                TextField("Role name", text: $newRole)
                TextField("Hourly rate", text: $newRate)
                    .keyboardType(.decimalPad)
                Button("Cancel", role: .cancel) {
                    newRole = ""; newRate = ""
                }
                Button("Add") {
                    let trimmed = newRole.trimmingCharacters(in: .whitespaces)
                    guard !trimmed.isEmpty else { return }
                    let rate = ExplorerLaborRate(
                        roleName: trimmed,
                        hourlyRate: Double(newRate) ?? 0,
                        sortOrder: rates.count
                    )
                    context.insert(rate)
                    newRole = ""; newRate = ""
                }
            }
            .alert("Labor limit reached", isPresented: $limitAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Explorer free tier allows up to \(ExplorerPolicy.laborRecordLimit) labor records.")
            }
        }
    }

    private func seedIfNeeded() {
        guard !seeded, rates.isEmpty else { return }
        seeded = true
        for (index, pair) in ExplorerLaborRate.seedDefaults.enumerated() {
            context.insert(ExplorerLaborRate(roleName: pair.0, hourlyRate: pair.1, sortOrder: index))
        }
    }

    private func deleteRates(at offsets: IndexSet) {
        for i in offsets {
            context.delete(rates[i])
        }
    }
}
