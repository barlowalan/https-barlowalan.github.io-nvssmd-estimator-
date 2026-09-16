import SwiftUI
import SwiftData

@main
struct SEPExplorerApp: App {
    let container: ModelContainer = {
        let schema = Schema([
            ExplorerCustomer.self,
            ExplorerEstimate.self,
            ExplorerLine.self,
            ExplorerCatalogItem.self,
            ExplorerLaborRate.self
        ])

        do {
            return try ModelContainer(
                for: schema,
                configurations: [
                    ModelConfiguration(schema: schema)
                ]
            )
        } catch {
            fatalError(
                "Could not create SEP Explorer database: \(error)"
            )
        }
    }()

    var body: some Scene {
        WindowGroup {
            ExplorerRootView()
        }
        .modelContainer(container)
    }
}
