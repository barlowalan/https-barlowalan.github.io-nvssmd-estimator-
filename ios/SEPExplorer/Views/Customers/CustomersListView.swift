import SwiftUI
import SwiftData

struct CustomersListView: View {
    @Environment(\.modelContext) private var context
    @Query(sort: \ExplorerCustomer.name) private var customers: [ExplorerCustomer]
    @State private var showNew = false
    @State private var name = ""
    @State private var site = ""

    var body: some View {
        NavigationStack {
            List {
                if customers.isEmpty {
                    ContentUnavailableView(
                        "No customers",
                        systemImage: "person.2",
                        description: Text("Customers attach to Explorer estimates for on-site capture.")
                    )
                } else {
                    ForEach(customers) { customer in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(customer.name).font(.headline)
                            if !customer.site.isEmpty {
                                Text(customer.site)
                                    .font(.subheadline)
                                    .foregroundStyle(ExplorerTheme.muted)
                            }
                            Text("\(customer.estimates.count) project(s)")
                                .font(.caption)
                                .foregroundStyle(ExplorerTheme.brandPrimary)
                        }
                    }
                    .onDelete { offsets in
                        for i in offsets { context.delete(customers[i]) }
                    }
                }
            }
            .navigationTitle("Customers")
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button { showNew = true } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                }
            }
            .alert("New Customer", isPresented: $showNew) {
                TextField("Name", text: $name)
                TextField("Site", text: $site)
                Button("Cancel", role: .cancel) {
                    name = ""; site = ""
                }
                Button("Add") {
                    let trimmed = name.trimmingCharacters(in: .whitespaces)
                    guard !trimmed.isEmpty else { return }
                    context.insert(ExplorerCustomer(name: trimmed, site: site))
                    name = ""; site = ""
                }
            }
        }
    }
}
