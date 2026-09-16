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
    static let surface = Color(red: 0.957, green: 0.965, blue: 0.973)
    static let brandPrimary = Color(red: 0.773, green: 0.627, blue: 0.349) // gold
    static let brandNavy = Color(red: 0.039, green: 0.106, blue: 0.227)
    static let brandExplorer = Color(red: 0.310, green: 0.639, blue: 0.851)
    static let brandTertiary = Color(red: 0.953, green: 0.922, blue: 0.843)
    static let onSurface = Color(red: 0.039, green: 0.106, blue: 0.227)
    static let muted = Color(red: 0.420, green: 0.451, blue: 0.502)
}
