import SwiftUI
import SwiftData

struct EstimatesListView: View {
    @Environment(\.modelContext) private var context
    @Query(filter: #Predicate<ExplorerEstimate> { $0.isActive }, sort: \ExplorerEstimate.updatedAt, order: .reverse)
    private var estimates: [ExplorerEstimate]

    @State private var showNew = false
    @State private var limitAlert = false

    private var pipeline: Double {
        estimates.reduce(0) { $0 + $1.total }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text("SEP EXPLORER")
                                .font(.caption.weight(.bold))
                                .foregroundStyle(ExplorerTheme.brandPrimary)
                                .tracking(1.2)
                            Text("Projects")
                                .font(.largeTitle.bold())
                            Text("\(estimates.count)/\(ExplorerPolicy.activeProjectLimit) active · \(ExplorerPolicy.price)")
                                .font(.subheadline)
                                .foregroundStyle(ExplorerTheme.muted)
                        }
                        Spacer()
                        VStack(alignment: .trailing) {
                            Text("Pipeline")
                                .font(.caption)
                                .foregroundStyle(ExplorerTheme.muted)
                            Text(pipeline, format: .currency(code: "USD"))
                                .font(.title3.bold())
                                .foregroundStyle(ExplorerTheme.brandPrimary)
                        }
                    }
                    .listRowBackground(ExplorerTheme.brandTertiary)
                }

                if estimates.isEmpty {
                    ContentUnavailableView(
                        "No projects yet",
                        systemImage: "folder.badge.plus",
                        description: Text("Create an on-site estimate — Explorer free tier includes \(ExplorerPolicy.activeProjectLimit) active projects.")
                    )
                } else {
                    ForEach(estimates) { estimate in
                        NavigationLink(value: estimate) {
                            EstimateRow(estimate: estimate)
                        }
                    }
                    .onDelete(perform: delete)
                }
            }
            .navigationDestination(for: ExplorerEstimate.self) { estimate in
                EstimateDetailView(estimate: estimate)
            }
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        if ExplorerPolicy.canCreateProject(activeCount: estimates.count) {
                            showNew = true
                        } else {
                            limitAlert = true
                        }
                    } label: {
                        Image(systemName: "plus.circle.fill")
                    }
                    .accessibilityIdentifier("new-project-button")
                }
            }
            .sheet(isPresented: $showNew) {
                NewEstimateView()
            }
            .alert("Project limit reached", isPresented: $limitAlert) {
                Button("OK", role: .cancel) {}
            } message: {
                Text("Explorer free tier allows up to \(ExplorerPolicy.activeProjectLimit) active projects.")
            }
            .background(ExplorerTheme.surface)
        }
    }

    private func delete(at offsets: IndexSet) {
        for index in offsets {
            context.delete(estimates[index])
        }
    }
}

private struct EstimateRow: View {
    let estimate: ExplorerEstimate

    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(estimate.name)
                .font(.headline)
            HStack {
                Text(estimate.customer?.name ?? "No customer")
                    .font(.subheadline)
                    .foregroundStyle(ExplorerTheme.muted)
                Spacer()
                Text(estimate.total, format: .currency(code: "USD"))
                    .font(.subheadline.weight(.semibold))
                    .foregroundStyle(ExplorerTheme.brandPrimary)
            }
            Text(estimate.projectType)
                .font(.caption)
                .padding(.horizontal, 8)
                .padding(.vertical, 3)
                .background(ExplorerTheme.brandTertiary)
                .clipShape(Capsule())
        }
        .padding(.vertical, 4)
    }
}
