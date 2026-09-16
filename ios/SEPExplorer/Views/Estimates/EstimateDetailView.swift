import SwiftUI
import SwiftData

struct EstimateDetailView: View {
    @Bindable var estimate: ExplorerEstimate
    @Environment(\.modelContext) private var context
    @Query(sort: \ExplorerLaborRate.sortOrder) private var rates: [ExplorerLaborRate]
    @Query private var catalog: [ExplorerCatalogItem]

    @State private var showAddLine = false
    @State private var showPickCatalog = false

    var body: some View {
        List {
            Section("Summary") {
                LabeledContent("Customer", value: estimate.customer?.name ?? "—")
                LabeledContent("Type", value: estimate.projectType)
                LabeledContent("Material", value: estimate.materialCost.asUSD)
                LabeledContent("Labor", value: estimate.laborCost.asUSD)
                LabeledContent("OH / Profit / Contingency") {
                    Text("\(Int(estimate.overheadPct))% / \(Int(estimate.profitPct))% / \(Int(estimate.contingencyPct))%")
                }
                LabeledContent("Total") {
                    Text(estimate.total.asUSD)
                        .font(.headline)
                        .foregroundStyle(ExplorerTheme.brandPrimary)
                }
            }

            Section("System counts") {
                LabeledContent("Cameras", value: "\(estimate.cameras)")
                LabeledContent("Doors", value: "\(estimate.doors)")
                LabeledContent("IDS", value: "\(estimate.idsPoints)")
                LabeledContent("Intercoms", value: "\(estimate.intercoms)")
                LabeledContent("Cable runs", value: "\(estimate.cableRuns)")
            }

            Section("Line items") {
                if estimate.lines.isEmpty {
                    Text("No line items yet")
                        .foregroundStyle(ExplorerTheme.muted)
                } else {
                    ForEach(estimate.lines) { line in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(line.descriptionText).font(.headline)
                            Text("Qty \(line.quantity.formatted()) · Mat \(line.extendedMaterial.asUSD) · Labor \(line.extendedLabor.asUSD)")
                                .font(.caption)
                                .foregroundStyle(ExplorerTheme.muted)
                        }
                    }
                    .onDelete { offsets in
                        for i in offsets {
                            context.delete(estimate.lines[i])
                        }
                        estimate.updatedAt = Date()
                    }
                }
            }

            if !ExplorerPolicy.includesDrawing {
                Section {
                    Label("Drawing tools are not included in Explorer", systemImage: "pencil.and.ruler")
                        .foregroundStyle(ExplorerTheme.muted)
                        .font(.footnote)
                }
            }
        }
        .navigationTitle(estimate.name)
        .toolbar {
            ToolbarItemGroup(placement: .primaryAction) {
                Button {
                    showPickCatalog = true
                } label: {
                    Image(systemName: "cube.box")
                }
                Button {
                    showAddLine = true
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityIdentifier("add-line-button")
            }
        }
        .sheet(isPresented: $showAddLine) {
            AddLineView(estimate: estimate, rates: rates)
        }
        .sheet(isPresented: $showPickCatalog) {
            PickCatalogView(estimate: estimate, catalog: catalog, rates: rates)
        }
    }
}

private extension Double {
    var asUSD: String {
        formatted(.currency(code: "USD"))
    }
}
