import Foundation
import SwiftData

@Model
final class ExplorerEstimate {
    var id: UUID
    var name: String
    var projectType: String
    var status: String
    var scopeNotes: String
    var overheadPct: Double
    var profitPct: Double
    var contingencyPct: Double
    var cameras: Int
    var doors: Int
    var idsPoints: Int
    var intercoms: Int
    var cableRuns: Int
    var createdAt: Date
    var updatedAt: Date
    var isActive: Bool

    var customer: ExplorerCustomer?

    @Relationship(deleteRule: .cascade, inverse: \ExplorerLine.estimate)
    var lines: [ExplorerLine]

    init(
        name: String,
        projectType: String = "Commercial",
        customer: ExplorerCustomer? = nil
    ) {
        self.id = UUID()
        self.name = name
        self.projectType = projectType
        self.status = "Active"
        self.scopeNotes = ""
        self.overheadPct = 10
        self.profitPct = 12
        self.contingencyPct = 5
        self.cameras = 0
        self.doors = 0
        self.idsPoints = 0
        self.intercoms = 0
        self.cableRuns = 0
        self.createdAt = Date()
        self.updatedAt = Date()
        self.isActive = true
        self.customer = customer
        self.lines = []
    }

    var materialCost: Double {
        lines.reduce(0) { $0 + ($1.quantity * $1.unitCost) }
    }

    var laborCost: Double {
        lines.reduce(0) { $0 + ($1.laborHours * $1.laborRate) }
    }

    var subtotal: Double { materialCost + laborCost }

    var overhead: Double { subtotal * overheadPct / 100 }
    var profit: Double { (subtotal + overhead) * profitPct / 100 }
    var contingency: Double { (subtotal + overhead + profit) * contingencyPct / 100 }

    var total: Double { subtotal + overhead + profit + contingency }
}
