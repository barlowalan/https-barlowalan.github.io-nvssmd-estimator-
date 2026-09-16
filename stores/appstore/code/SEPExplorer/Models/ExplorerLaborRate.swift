import Foundation
import SwiftData

@Model
final class ExplorerLaborRate {
    var id: UUID
    var roleName: String
    var hourlyRate: Double
    var sortOrder: Int
    var createdAt: Date

    init(roleName: String, hourlyRate: Double, sortOrder: Int = 0) {
        self.id = UUID()
        self.roleName = roleName
        self.hourlyRate = hourlyRate
        self.sortOrder = sortOrder
        self.createdAt = Date()
    }

    static let seedDefaults: [(String, Double)] = [
        ("Technician", 75),
        ("Lead Technician", 95),
        ("Engineer / Programmer", 130),
        ("Project Manager", 140),
        ("Closeout / O&M", 85),
    ]
}
