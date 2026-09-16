import SwiftUI
import SwiftData

struct CatalogListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \ExplorerCatalogItem.manufacturer) private var items: [ExplorerCatalogItem]

    @State private var showNew = false
    @State private var limitAlert = false
    @State private var category = "All"

    private let categories = ["All", "CCTV", "Access Control", "IDS", "Intercom", "Cabling", "Network/Headend"]

    private var filtered: [ExplorerCatalogItem] {
        category == "All" ? items : items.filter { $0.category == category }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("\(items.count)/\(ExplorerPolicy.catalogRecordLimit) catalog records")
                        .font(.subheadline)
                        .foregroundStyle(ExplorerTheme.muted)
                    ScrollView(.horizontal, showsIndicators: false) {
                        HStack {
                            ForEach(categories, id: \.self) { cat in
                                Button(cat) { category = cat }
                                    .buttonStyle(.bordered)
                                    .tint(category == cat ? ExplorerTheme.brandPrimary : ExplorerTheme.muted)
                            }
                        }
                    }
                }

                ForEach(filtered) { item in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(item.displayName).font(.headline)
                        Text("\(item.category) · \(item.cost.formatted(.currency(code: "USD")))")
                            .font(.caption)
                            .foregroundStyle(ExplorerTheme.muted)
                        if item.ndaa {
                            Text("NDAA")
                                .font(.caption2.weight(.bold))
                                .foregroundStyle(ExplorerTheme.brandPrimary)
                        }
                    }
                }
                .onDelete(perform: delete)
            }
            .navigationTitle("Catalog")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        if ExplorerPolicy.canCreateCatalogRecord(count: items.count) {
                            showNew = true
                        } else {
                            limitAlert = true
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .accessibilityIdentifier("add-equipment-button")
                }
            }
            .sheet(isPresented: $showNew) {
                NewCatalogItemView()
            }
            .alert("Catalog limit reached", isPresented: $limitAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Explorer free tier allows up to \(ExplorerPolicy.catalogRecordLimit) catalog records.")
            }
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            let item = filtered[index]
            context.delete(item)
        }
    }
}

struct NewCatalogItemView: View {
    @Environment(\.modelContext) private var context
    @Environment(\.dismiss) private var dismiss

    @State private var manufacturer = ""
    @State private var model = ""
    @State private var category = "CCTV"
    @State private var cost = ""
    @State private var partNumber = ""
    @State private var ndaa = false

    private let categories = ["CCTV", "Access Control", "IDS", "Intercom", "Cabling", "Network/Headend"]

    var body: some View {
        NavigationStack {
            Form {
                TextField("Manufacturer", text: $manufacturer)
                TextField("Model", text: $model)
                TextField("Part number", text: $partNumber)
                Picker("Category", selection: $category) {
                    ForEach(categories, id: \.self) { Text($0) }
                }
                TextField("Cost", text: $cost).keyboardType(.decimalPad)
                Toggle("NDAA compliant", isOn: $ndaa)
            }
            .navigationTitle("Add Catalog Item")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") { save() }
                        .disabled(manufacturer.isEmpty || model.isEmpty)
                }
            }
        }
    }

    private func save() {
        let item = ExplorerCatalogItem(
            manufacturer: manufacturer.trimmingCharacters(in: .whitespaces),
            model: model.trimmingCharacters(in: .whitespaces),
            category: category,
            cost: Double(cost) ?? 0,
            partNumber: partNumber,
            ndaa: ndaa
        )
        context.insert(item)
        dismiss()
    }
}
