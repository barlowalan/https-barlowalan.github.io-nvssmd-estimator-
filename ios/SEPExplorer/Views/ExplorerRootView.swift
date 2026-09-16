import SwiftUI
import SwiftData

struct ExplorerRootView: View {
    var body: some View {
        TabView {
            EstimatesListView()
                .tabItem {
                    Label("Projects", systemImage: "folder")
                }

            CatalogListView()
                .tabItem {
                    Label("Catalog", systemImage: "cube.box")
                }

            CustomersListView()
                .tabItem {
                    Label("Customers", systemImage: "person.2")
                }

            ExplorerSettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape")
                }
        }
        .tint(ExplorerTheme.brandPrimary)
    }
}

enum ExplorerTheme {
    static let surface = Color(red: 0.976, green: 0.976, blue: 0.969)
    static let brandPrimary = Color(red: 0.357, green: 0.482, blue: 0.427)
    static let brandTertiary = Color(red: 0.929, green: 0.945, blue: 0.937)
    static let onSurface = Color(red: 0.110, green: 0.110, blue: 0.118)
    static let muted = Color(red: 0.557, green: 0.557, blue: 0.576)
}
