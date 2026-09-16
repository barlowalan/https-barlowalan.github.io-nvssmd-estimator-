package com.nvssmd.sepexplorer.data

import java.util.UUID

data class ExplorerCustomer(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val site: String = "",
    val contactName: String = "",
    val phone: String = "",
    val email: String = "",
    val notes: String = "",
    val createdAt: Long = System.currentTimeMillis(),
)

data class ExplorerLine(
    val id: String = UUID.randomUUID().toString(),
    val descriptionText: String,
    val quantity: Double = 1.0,
    val unitCost: Double = 0.0,
    val laborHours: Double = 0.0,
    val laborRole: String = "Technician",
    val laborRate: Double = 75.0,
    val category: String = "CCTV",
) {
    val extendedMaterial: Double get() = quantity * unitCost
    val extendedLabor: Double get() = laborHours * laborRate
    val lineTotal: Double get() = extendedMaterial + extendedLabor
}

data class ExplorerEstimate(
    val id: String = UUID.randomUUID().toString(),
    val name: String,
    val projectType: String = "Commercial",
    val status: String = "Active",
    val scopeNotes: String = "",
    val overheadPct: Double = 10.0,
    val profitPct: Double = 12.0,
    val contingencyPct: Double = 5.0,
    val cameras: Int = 0,
    val doors: Int = 0,
    val idsPoints: Int = 0,
    val intercoms: Int = 0,
    val cableRuns: Int = 0,
    val createdAt: Long = System.currentTimeMillis(),
    val updatedAt: Long = System.currentTimeMillis(),
    val isActive: Boolean = true,
    val customerId: String? = null,
    val lines: List<ExplorerLine> = emptyList(),
) {
    val materialCost: Double get() = lines.sumOf { it.extendedMaterial }
    val laborCost: Double get() = lines.sumOf { it.extendedLabor }
    val subtotal: Double get() = materialCost + laborCost
    val overhead: Double get() = subtotal * overheadPct / 100.0
    val profit: Double get() = (subtotal + overhead) * profitPct / 100.0
    val contingency: Double get() = (subtotal + overhead + profit) * contingencyPct / 100.0
    val total: Double get() = subtotal + overhead + profit + contingency
}

data class ExplorerCatalogItem(
    val id: String = UUID.randomUUID().toString(),
    val manufacturer: String,
    val model: String,
    val category: String = "CCTV",
    val cost: Double = 0.0,
    val partNumber: String = "",
    val ndaa: Boolean = false,
) {
    val displayName: String get() = "$manufacturer $model"
}

data class ExplorerLaborRate(
    val id: String = UUID.randomUUID().toString(),
    val roleName: String,
    val hourlyRate: Double,
    val sortOrder: Int = 0,
) {
    companion object {
        val seedDefaults = listOf(
            "Technician" to 75.0,
            "Lead Technician" to 95.0,
            "Engineer / Programmer" to 130.0,
            "Project Manager" to 140.0,
            "Closeout / O&M" to 85.0,
        )
    }
}
