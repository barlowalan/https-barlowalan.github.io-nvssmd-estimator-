package com.nvssmd.sepexplorer

object ExplorerPolicy {
    const val tier = "Explorer"
    const val price = "Free"

    const val activeProjectLimit = 10
    const val catalogRecordLimit = 50
    const val laborRecordLimit = 20

    const val includesDrawing = false
    const val includesProjectManagement = false
    const val includesFinance = false

    fun canCreateProject(activeCount: Int) = activeCount < activeProjectLimit
    fun canCreateCatalogRecord(count: Int) = count < catalogRecordLimit
    fun canCreateLaborRecord(count: Int) = count < laborRecordLimit
}
