import SwiftUI
import SwiftData

struct DesignRootView: View {
    @Environment(\.modelContext) private var modelContext
    @EnvironmentObject private var workspace: DesignWorkspace
    @Query(sort: \DesignProject.updatedAt, order: .reverse) private var projects: [DesignProject]
    @State private var selectedProject: DesignProject?
    @State private var showNewProject = false
    @State private var columnVisibility = NavigationSplitViewVisibility.all

    var body: some View {
        NavigationSplitView(columnVisibility: $columnVisibility) {
            ProjectSidebar(
                projects: projects,
                selected: $selectedProject,
                onNew: { showNewProject = true }
            )
            .navigationSplitViewColumnWidth(min: 260, ideal: 300, max: 360)
        } content: {
            if let project = selectedProject {
                SheetBrowser(project: project)
            } else {
                ContentUnavailableView(
                    "Select a Project",
                    systemImage: "building.2",
                    description: Text("SEP Design unifies survey, CAD drawing, coverage, schematics, estimating, and documents for security systems.")
                )
            }
        } detail: {
            if let project = selectedProject {
                WorkspaceDetail(project: project)
            } else {
                WelcomeView(onCreate: { showNewProject = true }, onSample: createSample)
            }
        }
        .tint(DesignTheme.brandPrimary)
        .sheet(isPresented: $showNewProject) {
            NewProjectSheet { project in
                selectedProject = project
            }
        }
        .onAppear {
            SeedCatalog.populate(context: modelContext)
            if selectedProject == nil {
                selectedProject = projects.first
            }
        }
        .onReceive(NotificationCenter.default.publisher(for: .sepNewProject)) { _ in
            showNewProject = true
        }
    }

    private func createSample() {
        let project = SeedCatalog.makeSampleProject(context: modelContext)
        selectedProject = project
    }
}

struct ProjectSidebar: View {
    let projects: [DesignProject]
    @Binding var selected: DesignProject?
    var onNew: () -> Void

    var body: some View {
        List {
            Section {
                ForEach(projects, id: \.id) { project in
                    Button {
                        selected = project
                    } label: {
                        ProjectRow(project: project)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(6)
                            .background(
                                selected?.id == project.id
                                ? DesignTheme.brandTertiary.opacity(0.7)
                                : Color.clear,
                                in: RoundedRectangle(cornerRadius: 8)
                            )
                    }
                    .buttonStyle(.plain)
                }
            } header: {
                Text("Projects")
            }

            Section("Industry Bridge") {
                ForEach(IndustryBridge.capabilities.prefix(4)) { cap in
                    Label {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(cap.product).font(.caption.weight(.semibold))
                            Text(cap.sepFeature).font(.caption2).foregroundStyle(DesignTheme.muted)
                        }
                    } icon: {
                        Image(systemName: cap.mode.systemImage)
                            .foregroundStyle(DesignTheme.brandAccent)
                    }
                }
                NavigationLink {
                    IndustryBridgeView()
                } label: {
                    Text("All 14 tools →")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DesignTheme.brandAccent)
                }
            }
        }
        .navigationTitle("SEP Design")
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: onNew) {
                    Image(systemName: "plus")
                }
                .accessibilityLabel("New Project")
            }
            ToolbarItem(placement: .topBarLeading) {
                NavigationLink {
                    DesignSettingsView()
                } label: {
                    Image(systemName: "gearshape")
                }
            }
        }
        .listStyle(.sidebar)
        .background(DesignTheme.surface)
    }
}

struct ProjectRow: View {
    let project: DesignProject

    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(project.name)
                .font(.headline)
                .foregroundStyle(DesignTheme.onSurface)
            Text(project.clientName.isEmpty ? "No client" : project.clientName)
                .font(.caption)
                .foregroundStyle(DesignTheme.muted)
            HStack(spacing: 6) {
                StatusChip(status: project.status)
                Text("\(project.sheets.count) sheets")
                    .font(.caption2)
                    .foregroundStyle(DesignTheme.muted)
            }
        }
        .padding(.vertical, 4)
    }
}

struct StatusChip: View {
    let status: ProjectStatus

    var body: some View {
        Text(status.rawValue)
            .font(.caption2.weight(.semibold))
            .padding(.horizontal, 8)
            .padding(.vertical, 3)
            .background(DesignTheme.brandTertiary, in: Capsule())
            .foregroundStyle(DesignTheme.brandNavy)
    }
}

struct WelcomeView: View {
    var onCreate: () -> Void
    var onSample: () -> Void

    var body: some View {
        ZStack {
            LinearGradient(
                colors: [DesignTheme.surface, DesignTheme.brandTertiary.opacity(0.45), DesignTheme.surface],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
            .ignoresSafeArea()

            VStack(spacing: 28) {
                VStack(spacing: 8) {
                    Image(systemName: "square.grid.3x3.topleft.filled")
                        .font(.system(size: 48))
                        .foregroundStyle(DesignTheme.brandGold)
                    Text("SEP Design")
                        .font(.system(size: 42, weight: .bold, design: .serif))
                        .foregroundStyle(DesignTheme.brandNavy)
                    Text(DesignPolicy.tagline)
                        .font(.title3)
                        .foregroundStyle(DesignTheme.muted)
                    Text("Native iPad drawing for IDS, access control, infrastructure & video surveillance.\nVisio · AutoCAD · PDF import/export.")
                        .font(.body)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(DesignTheme.onSurface)
                        .frame(maxWidth: 520)
                }

                HStack(spacing: 16) {
                    Button(action: onCreate) {
                        Label("New Project", systemImage: "plus.circle.fill")
                            .padding(.horizontal, 8)
                    }
                    .buttonStyle(.borderedProminent)
                    .tint(DesignTheme.brandNavy)

                    Button(action: onSample) {
                        Label("Load Sample Campus", systemImage: "building.2")
                    }
                    .buttonStyle(.bordered)
                }

                HStack(spacing: 12) {
                    FormatBadge(format: .visio)
                    FormatBadge(format: .cad)
                    FormatBadge(format: .pdf)
                    Text("symbols & round-trip")
                        .font(.caption)
                        .foregroundStyle(DesignTheme.muted)
                }
            }
            .padding(40)
        }
    }
}
