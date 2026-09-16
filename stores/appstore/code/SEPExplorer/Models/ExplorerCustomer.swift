import Foundation
import SwiftData

@Model
final class ExplorerCustomer {
    var id: UUID
    var name: String
    var site: String
    var contactName: String
    var phone: String
    var email: String
    var notes: String
    var createdAt: Date

    @Relationship(deleteRule: .nullify, inverse: \ExplorerEstimate.customer)
    var estimates: [ExplorerEstimate]

    init(
        name: String,
        site: String = "",
        contactName: String = "",
        phone: String = "",
        email: String = "",
        notes: String = ""
    ) {
        self.id = UUID()
        self.name = name
        self.site = site
        self.contactName = contactName
        self.phone = phone
        self.email = email
        self.notes = notes
        self.createdAt = Date()
        self.estimates = []
    }
}
