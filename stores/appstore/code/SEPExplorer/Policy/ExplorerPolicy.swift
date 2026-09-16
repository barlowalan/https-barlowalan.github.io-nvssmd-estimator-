import Foundation

enum ExplorerPolicy {
    static let tier = "Explorer"
    static let price = "Free"

    static let activeProjectLimit = 10
    static let catalogRecordLimit = 50
    static let laborRecordLimit = 20

    static let includesDrawing = false
    static let includesProjectManagement = false
    static let includesFinance = false

    static func canCreateProject(activeCount: Int) -> Bool {
        activeCount < activeProjectLimit
    }

    static func canCreateCatalogRecord(count: Int) -> Bool {
        count < catalogRecordLimit
    }

    static func canCreateLaborRecord(count: Int) -> Bool {
        count < laborRecordLimit
    }
}
