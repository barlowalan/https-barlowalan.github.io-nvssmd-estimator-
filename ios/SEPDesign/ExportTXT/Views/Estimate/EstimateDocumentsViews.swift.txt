import SwiftUI
import SwiftData

/// ConEst + Jetbuilt + D-Tools + Specifi + IPVM estimating surface.
struct EstimateView: View {
    @Bindable var project: DesignProject
    @Environment(\.modelContext) private var modelContext
    @Query(sort: \CatalogDevice.manufacturer) private var catalog: [CatalogDevice]
    @State private var ohPercent = 12.0
    @State private var profitPercent = 10.0
    @State private var contingencyPercent = 5.0

    var body: some View {
        HStack(spacing: 0) {
            List {
                Section {
                    Text("Takeoff from drawing · Specifi catalog · ConEst labor · Jetbuilt proposal totals")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                    Button("Rebuild BOM from Placed Devices") { rebuildFromDevices() }
                }

                Section("Line Items") {
                    ForEach(project.estimateLines) { line in
                        VStack(alignment: .leading, spacing: 4) {
                            Text(line.descriptionText).font(.subheadline.weight(.semibold))
                            HStack {
                                Text("Qty \(line.quantity, format: .number)")
                                Spacer()
                                Text(line.extended, format: .currency(code: "USD"))
                                    .foregroundStyle(DesignTheme.brandNavy)
                            }
                            .font(.caption)
                            .foregroundStyle(DesignTheme.muted)
                        }
                    }
                    .onDelete { indexSet in
                        for i in indexSet {
                            modelContext.delete(project.estimateLines[i])
                        }
                    }
                }

                Section("Catalog (Specifi / IPVM)") {
                    ForEach(catalog.prefix(20)) { item in
                        Button {
                            addFromCatalog(item)
                        } label: {
                            HStack {
                                SymbolGlyphView(symbolID: item.symbolID, size: 24, tint: item.discipline.color)
                                VStack(alignment: .leading) {
                                    Text("\(item.manufacturer) \(item.modelName)")
                                        .font(.subheadline)
                                    Text("\(item.sku) · \(item.unitCost, format: .currency(code: "USD"))")
                                        .font(.caption2)
                                        .foregroundStyle(DesignTheme.muted)
                                }
                                Spacer()
                                Image(systemName: "plus.circle")
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .frame(maxWidth: 520)

            Divider()

            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    Text("Proposal Summary")
                        .font(.title2.weight(.bold))
                    Text("Jetbuilt-style roll-up")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)

                    summaryRow("Material", materialSubtotal)
                    summaryRow("Labor", laborSubtotal)
                    Divider()
                    summaryRow("Subtotal", materialSubtotal + laborSubtotal)
                    SliderRow(title: "Overhead", value: $ohPercent)
                    SliderRow(title: "Profit", value: $profitPercent)
                    SliderRow(title: "Contingency", value: $contingencyPercent)
                    Divider()
                    summaryRow("Grand Total", grandTotal, emphasize: true)

                    ShareLink(
                        item: proposalText,
                        subject: Text(project.name),
                        message: Text("SEP Design proposal")
                    ) {
                        Label("Share Proposal", systemImage: "square.and.arrow.up")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(DesignTheme.brandNavy)
                }
                .padding(24)
            }
            .background(DesignTheme.surface)
        }
    }

    private var materialSubtotal: Double {
        project.estimateLines.reduce(0) { $0 + $1.materialTotal }
    }

    private var laborSubtotal: Double {
        project.estimateLines.reduce(0) { $0 + $1.laborTotal }
    }

    private var grandTotal: Double {
        let sub = materialSubtotal + laborSubtotal
        let oh = sub * ohPercent / 100
        let profit = (sub + oh) * profitPercent / 100
        let cont = (sub + oh + profit) * contingencyPercent / 100
        return sub + oh + profit + cont
    }

    private var proposalText: String {
        """
        SEP Design Proposal
        \(project.name)
        Client: \(project.clientName)
        Site: \(project.siteAddress)

        Material: \(materialSubtotal)
        Labor: \(laborSubtotal)
        Grand Total: \(grandTotal)

        Generated by SEP Design · NVSSMD
        """
    }

    private func summaryRow(_ title: String, _ value: Double, emphasize: Bool = false) -> some View {
        HStack {
            Text(title)
                .font(emphasize ? .headline : .body)
            Spacer()
            Text(value, format: .currency(code: "USD"))
                .font(emphasize ? .title3.weight(.bold) : .body.monospacedDigit())
                .foregroundStyle(emphasize ? DesignTheme.brandGold : DesignTheme.onSurface)
        }
    }

    private func rebuildFromDevices() {
        for line in project.estimateLines {
            modelContext.delete(line)
        }
        project.estimateLines.removeAll()
        for sheet in project.sheets {
            for d in sheet.devices where d.unitCost > 0 || d.laborHours > 0 {
                project.estimateLines.append(DesignEstimateLine(
                    descriptionText: "\(d.label) (\(d.tag))",
                    quantity: 1,
                    unitCost: d.unitCost,
                    laborHours: d.laborHours
                ))
            }
        }
        project.updatedAt = Date()
    }

    private func addFromCatalog(_ item: CatalogDevice) {
        project.estimateLines.append(DesignEstimateLine(
            descriptionText: "\(item.manufacturer) \(item.modelName)",
            quantity: 1,
            unitCost: item.unitCost,
            laborHours: item.laborHours
        ))
        project.updatedAt = Date()
    }
}

struct SliderRow: View {
    let title: String
    @Binding var value: Double

    var body: some View {
        VStack(alignment: .leading) {
            HStack {
                Text(title)
                Spacer()
                Text("\(Int(value))%")
                    .foregroundStyle(DesignTheme.muted)
            }
            Slider(value: $value, in: 0...40, step: 1)
                .tint(DesignTheme.brandGold)
        }
    }
}

/// Simply Wise + SiteOwl + Bluebeam document vault.
struct DocumentsView: View {
    @Bindable var project: DesignProject
    @EnvironmentObject private var workspace: DesignWorkspace
    @State private var showImporter = false

    var body: some View {
        List {
            Section {
                Text("Document vault inspired by Simply Wise, SiteOwl as-builts, and Bluebeam PDF sets.")
                    .font(.caption)
                    .foregroundStyle(DesignTheme.muted)
                Button {
                    showImporter = true
                } label: {
                    Label("Import Visio / AutoCAD / PDF", systemImage: "square.and.arrow.down")
                }
            }

            Section("Files") {
                if project.documents.isEmpty {
                    Text("No documents yet")
                        .foregroundStyle(DesignTheme.muted)
                } else {
                    ForEach(project.documents) { doc in
                        HStack(spacing: 12) {
                            Image(systemName: icon(for: doc.kind))
                                .foregroundStyle(DesignTheme.brandAccent)
                                .frame(width: 28)
                            VStack(alignment: .leading) {
                                Text(doc.title).font(.subheadline.weight(.semibold))
                                Text("\(doc.kind.rawValue) · \(doc.fileName)")
                                    .font(.caption2)
                                    .foregroundStyle(DesignTheme.muted)
                            }
                            Spacer()
                            FormatBadge(format: badge(for: doc.kind))
                        }
                    }
                    .onDelete { idx in
                        for i in idx { project.documents.remove(at: i) }
                    }
                }
            }

            Section("Bluebeam-style Markups") {
                let markups = project.sheets.flatMap(\.markups)
                if markups.isEmpty {
                    Text("Switch to Markup mode on a sheet to add clouds, callouts, and stamps.")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                } else {
                    ForEach(markups) { m in
                        Label("\(m.kind.rawValue): \(m.text)", systemImage: "pencil.tip.crop.circle")
                    }
                }
            }
        }
        .fileImporter(
            isPresented: $showImporter,
            allowedContentTypes: DesignImportService.supportedTypes,
            allowsMultipleSelection: false
        ) { result in
            if case .success(let urls) = result, let url = urls.first {
                let accessed = url.startAccessingSecurityScopedResource()
                defer { if accessed { url.stopAccessingSecurityScopedResource() } }
                let ext = url.pathExtension.lowercased()
                let kind: DocumentKind
                switch ext {
                case "pdf": kind = .floorPlanPDF
                case "vsdx", "vdx", "vsd": kind = .visio
                case "dxf", "dwg": kind = .autocad
                default: kind = .other
                }
                project.documents.append(ProjectDocument(
                    title: url.deletingPathExtension().lastPathComponent,
                    kind: kind,
                    fileName: url.lastPathComponent
                ))
                workspace.lastImportMessage = "Filed \(url.lastPathComponent) in document vault."
                // Also push into active sheet when possible
                NotificationCenter.default.post(
                    name: ext == "pdf" ? .sepImportPDF : (ext == "dxf" || ext == "dwg" ? .sepImportCAD : .sepImportVisio),
                    object: nil
                )
            }
        }
    }

    private func icon(for kind: DocumentKind) -> String {
        switch kind {
        case .floorPlanPDF: return "doc.richtext"
        case .visio: return "square.on.square"
        case .autocad: return "angle"
        case .photo: return "photo"
        case .asBuilt: return "checkmark.seal"
        case .proposal: return "doc.text"
        case .submittal: return "tray.and.arrow.down"
        case .other: return "doc"
        }
    }

    private func badge(for kind: DocumentKind) -> FormatBadge.Format {
        switch kind {
        case .visio: return .visio
        case .autocad: return .cad
        default: return .pdf
        }
    }
}

struct IndustryBridgeView: View {
    @EnvironmentObject private var workspace: DesignWorkspace
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text("SEP Design brings the essential workflows from these platforms into one native iPad app.")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                }
                ForEach(IndustryBridge.capabilities) { cap in
                    Button {
                        workspace.activeMode = cap.mode
                        dismiss()
                    } label: {
                        HStack(alignment: .top, spacing: 12) {
                            Text(cap.id)
                                .font(.caption.monospaced().weight(.bold))
                                .foregroundStyle(DesignTheme.brandGold)
                                .frame(width: 24)
                            VStack(alignment: .leading, spacing: 4) {
                                Text(cap.product)
                                    .font(.headline)
                                    .foregroundStyle(DesignTheme.onSurface)
                                Text(cap.sepFeature)
                                    .font(.subheadline)
                                    .foregroundStyle(DesignTheme.muted)
                                Label(cap.mode.rawValue, systemImage: cap.mode.systemImage)
                                    .font(.caption)
                                    .foregroundStyle(DesignTheme.brandAccent)
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }
            }
            .navigationTitle("14 Tools → One App")
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}
