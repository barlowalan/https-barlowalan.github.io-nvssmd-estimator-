import Foundation
import SwiftData

@Model
final class ExplorerLine {
    var id: UUID
    var descriptionText: String
    var quantity: Double
    var unitCost: Double
    var laborHours: Double
    var laborRole: String
    var laborRate: Double
    var category: String
    var createdAt: Date

    var estimate: ExplorerEstimate?

    init(
        descriptionText: String,
        quantity: Double = 1,
        unitCost: Double = 0,
        laborHours: Double = 0,
        laborRole: String = "Technician",
        laborRate: Double = 75,
        category: String = "CCTV"
    ) {
        self.id = UUID()
        self.descriptionText = descriptionText
        self.quantity = quantity
        self.unitCost = unitCost
        self.laborHours = laborHours
        self.laborRole = laborRole
        self.laborRate = laborRate
        self.category = category
        self.createdAt = Date()
    }

    var extendedMaterial: Double { quantity * unitCost }
    var extendedLabor: Double { laborHours * laborRate }
    var lineTotal: Double { extendedMaterial + extendedLabor }
}
