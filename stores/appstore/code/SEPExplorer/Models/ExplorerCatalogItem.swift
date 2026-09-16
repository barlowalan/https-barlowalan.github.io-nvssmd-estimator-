import Foundation
import SwiftData

@Model
final class ExplorerCatalogItem {
    var id: UUID
    var manufacturer: String
    var model: String
    var category: String
    var cost: Double
    var partNumber: String
    var ndaa: Bool
    var leadTimeDays: Int
    var warrantyYears: Int
    var createdAt: Date

    init(
        manufacturer: String,
        model: String,
        category: String = "CCTV",
        cost: Double = 0,
        partNumber: String = "",
        ndaa: Bool = false,
        leadTimeDays: Int = 0,
        warrantyYears: Int = 1
    ) {
        self.id = UUID()
        self.manufacturer = manufacturer
        self.model = model
        self.category = category
        self.cost = cost
        self.partNumber = partNumber
        self.ndaa = ndaa
        self.leadTimeDays = leadTimeDays
        self.warrantyYears = warrantyYears
        self.createdAt = Date()
    }

    var displayName: String {
        "\(manufacturer) \(model)"
    }
}
