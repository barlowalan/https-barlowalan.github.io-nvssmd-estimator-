import SwiftUI
import Observation
import CryptoKit

struct Line: Identifiable, Hashable, Codable {
    var id = UUID()
    var name = "Cat6"
    var ft = 0.0
    var cost = 0.18
    var sell = 0.42
    var totalCost: Double { ft * cost }
    var totalSell: Double { ft * sell }
}

struct Sig: Identifiable {
    let id = UUID()
    let role: String
    let hash: String
}

@Observable final class Store {
    var lines = [
        Line(name: "Cat6", ft: 1000, cost: 0.18, sell: 0.42),
        Line(name: "Fiber SM", ft: 500, cost: 0.62, sell: 1.25)
    ] {
        didSet { if !issued { signatures = [] } }
    }

    var revision = 0
    var signatures: [Sig] = []
    var issued = false

    var cost: Double { lines.reduce(0) { $0 + $1.totalCost } }
    var sell: Double { lines.reduce(0) { $0 + $1.totalSell } }
    var margin: Double { sell == 0 ? 0 : (sell - cost) / sell }

    var hash: String {
        let source = lines.map {
            "\($0.id.uuidString)|\($0.name)|\($0.ft)|\($0.cost)|\($0.sell)"
        }.sorted().joined(separator: "\n")
        return SHA256.hash(data: Data(source.utf8))
            .map { String(format: "%02x", $0) }.joined()
    }

    func addLine() { guard !issued else { return }; lines.append(Line()) }
    func deleteLines(at offsets: IndexSet) {
        guard !issued else { return }
        lines.remove(atOffsets: offsets)
    }

    func sign(_ role: String) {
        guard !issued else { return }
        signatures.removeAll { $0.role == role }
        signatures.append(Sig(role: role, hash: hash))
    }

    func issue() {
        let roles = ["Estimator", "Project Manager"]
        guard !issued, roles.allSatisfy({ role in
            signatures.contains { $0.role == role && $0.hash == hash }
        }) else { return }
        issued = true
    }

    func newRevision() {
        revision += 1
        signatures = []
        issued = false
    }
}

@main struct SEPApp: App {
    @State private var store = Store()
    var body: some Scene {
        WindowGroup { BOMView().environment(store) }
    }
}

struct BOMView: View {
    @Environment(Store.self) private var store

    var body: some View {
        @Bindable var store = store

        NavigationStack {
            List {
                Section("Revision \(store.revision)") {
                    Text(store.issued ? "Issued — Locked" : "Draft")
                        .foregroundStyle(store.issued ? .red : .green)
                }

                Section("Editable Cable BOM") {
                    ForEach($store.lines) { $line in
                        VStack(alignment: .leading) {
                            TextField("Cable type", text: $line.name)
                            TextField("Feet", value: $line.ft, format: .number)
                            TextField("Cost / ft", value: $line.cost, format: .currency(code: "USD"))
                            TextField("Sell / ft", value: $line.sell, format: .currency(code: "USD"))
                            Text("Line total: \(line.totalSell, format: .currency(code: "USD"))")
                                .font(.caption)
                        }
                        .disabled(store.issued)
                    }
                    .onDelete(perform: store.deleteLines)

                    Button("Add BOM Line", systemImage: "plus") {
                        store.addLine()
                    }
                    .disabled(store.issued)
                }

                Section("Totals") {
                    LabeledContent("Material Cost", value: store.cost.formatted(.currency(code: "USD")))
                    LabeledContent("Sell Price", value: store.sell.formatted(.currency(code: "USD")))
                    LabeledContent("Gross Margin", value: store.margin.formatted(.percent))
                }

                Section("Approvals") {
                    ForEach(["Estimator", "Project Manager"], id: .self) { role in
                        Button("Sign \(role)") { store.sign(role) }
                            .disabled(store.issued)
                    }
                }

                Button("Issue BOM") { store.issue() }
                    .disabled(store.issued)

                Button("Create New Revision") { store.newRevision() }
            }
            .navigationTitle("SEP Cable BOM")
        }
    }
}
