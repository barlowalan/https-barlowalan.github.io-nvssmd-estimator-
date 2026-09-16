package com.nvssmd.sepexplorer.data

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lightweight local store for Explorer free tier (mirrors SwiftData on iPad).
 */
class ExplorerStore(context: Context) {
    private val prefs = context.getSharedPreferences("sep_explorer", Context.MODE_PRIVATE)

    fun customers(): List<ExplorerCustomer> = readArray("customers") { o ->
        ExplorerCustomer(
            id = o.getString("id"),
            name = o.getString("name"),
            site = o.optString("site"),
            contactName = o.optString("contactName"),
            phone = o.optString("phone"),
            email = o.optString("email"),
            notes = o.optString("notes"),
            createdAt = o.optLong("createdAt"),
        )
    }

    fun saveCustomers(list: List<ExplorerCustomer>) {
        writeArray("customers", list) { c ->
            JSONObject()
                .put("id", c.id)
                .put("name", c.name)
                .put("site", c.site)
                .put("contactName", c.contactName)
                .put("phone", c.phone)
                .put("email", c.email)
                .put("notes", c.notes)
                .put("createdAt", c.createdAt)
        }
    }

    fun estimates(): List<ExplorerEstimate> = readArray("estimates") { o ->
        val lines = o.optJSONArray("lines") ?: JSONArray()
        val lineList = buildList {
            for (i in 0 until lines.length()) {
                val l = lines.getJSONObject(i)
                add(
                    ExplorerLine(
                        id = l.getString("id"),
                        descriptionText = l.getString("descriptionText"),
                        quantity = l.optDouble("quantity", 1.0),
                        unitCost = l.optDouble("unitCost", 0.0),
                        laborHours = l.optDouble("laborHours", 0.0),
                        laborRole = l.optString("laborRole", "Technician"),
                        laborRate = l.optDouble("laborRate", 75.0),
                        category = l.optString("category", "CCTV"),
                    )
                )
            }
        }
        ExplorerEstimate(
            id = o.getString("id"),
            name = o.getString("name"),
            projectType = o.optString("projectType", "Commercial"),
            status = o.optString("status", "Active"),
            overheadPct = o.optDouble("overheadPct", 10.0),
            profitPct = o.optDouble("profitPct", 12.0),
            contingencyPct = o.optDouble("contingencyPct", 5.0),
            cameras = o.optInt("cameras"),
            doors = o.optInt("doors"),
            idsPoints = o.optInt("idsPoints"),
            intercoms = o.optInt("intercoms"),
            cableRuns = o.optInt("cableRuns"),
            createdAt = o.optLong("createdAt"),
            updatedAt = o.optLong("updatedAt"),
            isActive = o.optBoolean("isActive", true),
            customerId = o.optString("customerId").ifBlank { null },
            lines = lineList,
        )
    }

    fun saveEstimates(list: List<ExplorerEstimate>) {
        writeArray("estimates", list) { e ->
            val lines = JSONArray()
            e.lines.forEach { l ->
                lines.put(
                    JSONObject()
                        .put("id", l.id)
                        .put("descriptionText", l.descriptionText)
                        .put("quantity", l.quantity)
                        .put("unitCost", l.unitCost)
                        .put("laborHours", l.laborHours)
                        .put("laborRole", l.laborRole)
                        .put("laborRate", l.laborRate)
                        .put("category", l.category)
                )
            }
            JSONObject()
                .put("id", e.id)
                .put("name", e.name)
                .put("projectType", e.projectType)
                .put("status", e.status)
                .put("overheadPct", e.overheadPct)
                .put("profitPct", e.profitPct)
                .put("contingencyPct", e.contingencyPct)
                .put("cameras", e.cameras)
                .put("doors", e.doors)
                .put("idsPoints", e.idsPoints)
                .put("intercoms", e.intercoms)
                .put("cableRuns", e.cableRuns)
                .put("createdAt", e.createdAt)
                .put("updatedAt", e.updatedAt)
                .put("isActive", e.isActive)
                .put("customerId", e.customerId)
                .put("lines", lines)
        }
    }

    fun catalog(): List<ExplorerCatalogItem> = readArray("catalog") { o ->
        ExplorerCatalogItem(
            id = o.getString("id"),
            manufacturer = o.getString("manufacturer"),
            model = o.getString("model"),
            category = o.optString("category", "CCTV"),
            cost = o.optDouble("cost", 0.0),
            partNumber = o.optString("partNumber"),
            ndaa = o.optBoolean("ndaa"),
        )
    }

    fun saveCatalog(list: List<ExplorerCatalogItem>) {
        writeArray("catalog", list) { c ->
            JSONObject()
                .put("id", c.id)
                .put("manufacturer", c.manufacturer)
                .put("model", c.model)
                .put("category", c.category)
                .put("cost", c.cost)
                .put("partNumber", c.partNumber)
                .put("ndaa", c.ndaa)
        }
    }

    fun laborRates(): List<ExplorerLaborRate> {
        val existing = readArray("labor") { o ->
            ExplorerLaborRate(
                id = o.getString("id"),
                roleName = o.getString("roleName"),
                hourlyRate = o.optDouble("hourlyRate", 0.0),
                sortOrder = o.optInt("sortOrder"),
            )
        }
        if (existing.isNotEmpty()) return existing
        val seeded = ExplorerLaborRate.seedDefaults.mapIndexed { index, pair ->
            ExplorerLaborRate(roleName = pair.first, hourlyRate = pair.second, sortOrder = index)
        }
        saveLaborRates(seeded)
        return seeded
    }

    fun saveLaborRates(list: List<ExplorerLaborRate>) {
        writeArray("labor", list) { r ->
            JSONObject()
                .put("id", r.id)
                .put("roleName", r.roleName)
                .put("hourlyRate", r.hourlyRate)
                .put("sortOrder", r.sortOrder)
        }
    }

    private fun <T> readArray(key: String, map: (JSONObject) -> T): List<T> {
        val raw = prefs.getString(key, "[]") ?: "[]"
        val arr = JSONArray(raw)
        return buildList {
            for (i in 0 until arr.length()) add(map(arr.getJSONObject(i)))
        }
    }

    private fun <T> writeArray(key: String, list: List<T>, map: (T) -> JSONObject) {
        val arr = JSONArray()
        list.forEach { arr.put(map(it)) }
        prefs.edit().putString(key, arr.toString()).apply()
    }
}
