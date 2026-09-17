import SwiftUI
import SwiftData

struct SymbolLibraryPanel: View {
    @EnvironmentObject private var workspace: DesignWorkspace
    @State private var search = ""
    @State private var formatFilter: FormatFilter = .all

    enum FormatFilter: String, CaseIterable {
        case all = "All"
        case visio = "Visio"
        case cad = "CAD"
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            HStack {
                Text("Symbol Library")
                    .font(.headline)
                Spacer()
                FormatBadge(format: .visio)
                FormatBadge(format: .cad)
            }
            .padding(12)

            Picker("Discipline", selection: $workspace.selectedDiscipline) {
                Text("All").tag(SystemDiscipline?.none)
                ForEach(SystemDiscipline.allCases) { d in
                    Text(d.rawValue).tag(Optional(d))
                }
            }
            .pickerStyle(.menu)
            .padding(.horizontal, 12)

            Picker("Format", selection: $formatFilter) {
                ForEach(FormatFilter.allCases, id: \.self) { Text($0.rawValue).tag($0) }
            }
            .pickerStyle(.segmented)
            .padding(.horizontal, 12)
            .padding(.vertical, 8)

            TextField("Search symbols", text: $search)
                .textFieldStyle(.roundedBorder)
                .padding(.horizontal, 12)

            List(filtered) { symbol in
                Button {
                    workspace.selectedSymbolID = symbol.id
                    workspace.selectedTool = .place
                } label: {
                    HStack(spacing: 10) {
                        SymbolGlyphView(
                            symbolID: symbol.id,
                            size: 32,
                            tint: symbol.discipline?.color ?? DesignTheme.brandNavy
                        )
                        .padding(6)
                        .background(DesignTheme.brandTertiary, in: RoundedRectangle(cornerRadius: 8))

                        VStack(alignment: .leading, spacing: 2) {
                            Text(symbol.name)
                                .font(.subheadline.weight(.semibold))
                                .foregroundStyle(DesignTheme.onSurface)
                            HStack(spacing: 6) {
                                Text(symbol.visioName)
                                    .font(.caption2)
                                    .foregroundStyle(Color(red: 0.15, green: 0.40, blue: 0.70))
                                Text("·")
                                    .foregroundStyle(DesignTheme.muted)
                                Text(symbol.cadBlock)
                                    .font(.caption2.monospaced())
                                    .foregroundStyle(Color(red: 0.75, green: 0.25, blue: 0.15))
                            }
                        }
                        Spacer()
                        if workspace.selectedSymbolID == symbol.id {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(DesignTheme.brandGold)
                        }
                    }
                }
                .buttonStyle(.plain)
                .listRowBackground(
                    workspace.selectedSymbolID == symbol.id
                    ? DesignTheme.brandTertiary.opacity(0.5)
                    : Color.clear
                )
            }
            .listStyle(.plain)
        }
    }

    private var filtered: [DesignSymbol] {
        SymbolLibrary.symbols(for: workspace.selectedDiscipline).filter { symbol in
            let matchesSearch = search.isEmpty
                || symbol.name.localizedCaseInsensitiveContains(search)
                || symbol.visioName.localizedCaseInsensitiveContains(search)
                || symbol.cadBlock.localizedCaseInsensitiveContains(search)
            let matchesFormat: Bool = {
                switch formatFilter {
                case .all: return true
                case .visio: return !symbol.visioName.isEmpty
                case .cad: return !symbol.cadBlock.isEmpty
                }
            }()
            return matchesSearch && matchesFormat
        }
    }
}

struct LayersPanel: View {
    @Bindable var sheet: DesignSheet

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            Text("Layers")
                .font(.headline)
                .padding(12)
            List {
                ForEach(sheet.layers.sorted(by: { $0.sortOrder < $1.sortOrder })) { layer in
                    HStack {
                        Circle().fill(layer.discipline.color).frame(width: 10, height: 10)
                        Text(layer.name).font(.subheadline)
                        Spacer()
                        Button {
                            layer.isVisible.toggle()
                        } label: {
                            Image(systemName: layer.isVisible ? "eye" : "eye.slash")
                        }
                        .buttonStyle(.plain)
                        Button {
                            layer.isLocked.toggle()
                        } label: {
                            Image(systemName: layer.isLocked ? "lock.fill" : "lock.open")
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
            .listStyle(.plain)
        }
    }
}
