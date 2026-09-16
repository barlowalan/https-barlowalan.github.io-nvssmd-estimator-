package com.nvssmd.sepexplorer

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Add
import androidx.compose.material.icons.filled.Folder
import androidx.compose.material.icons.filled.Inventory2
import androidx.compose.material.icons.filled.People
import androidx.compose.material.icons.filled.Settings
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.nvssmd.sepexplorer.data.*
import java.text.NumberFormat
import java.util.Locale

private val BrandPrimary = Color(0xFF5B7B6D)
private val Surface = Color(0xFFF9F9F7)
private val BrandTertiary = Color(0xFFEDF1EF)
private val Muted = Color(0xFF8E8E93)

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val store = ExplorerStore(applicationContext)
        setContent {
            MaterialTheme(
                colorScheme = lightColorScheme(
                    primary = BrandPrimary,
                    background = Surface,
                    surface = Color.White,
                )
            ) {
                ExplorerRoot(store)
            }
        }
    }
}

@Composable
fun ExplorerRoot(store: ExplorerStore) {
    var tab by remember { mutableIntStateOf(0) }
    var estimates by remember { mutableStateOf(store.estimates()) }
    var catalog by remember { mutableStateOf(store.catalog()) }
    var customers by remember { mutableStateOf(store.customers()) }
    var labor by remember { mutableStateOf(store.laborRates()) }

    fun refresh() {
        estimates = store.estimates()
        catalog = store.catalog()
        customers = store.customers()
        labor = store.laborRates()
    }

    Scaffold(
        bottomBar = {
            NavigationBar(containerColor = Color.White) {
                NavigationBarItem(
                    selected = tab == 0,
                    onClick = { tab = 0 },
                    icon = { Icon(Icons.Default.Folder, null) },
                    label = { Text("Projects") },
                )
                NavigationBarItem(
                    selected = tab == 1,
                    onClick = { tab = 1 },
                    icon = { Icon(Icons.Default.Inventory2, null) },
                    label = { Text("Catalog") },
                )
                NavigationBarItem(
                    selected = tab == 2,
                    onClick = { tab = 2 },
                    icon = { Icon(Icons.Default.People, null) },
                    label = { Text("Customers") },
                )
                NavigationBarItem(
                    selected = tab == 3,
                    onClick = { tab = 3 },
                    icon = { Icon(Icons.Default.Settings, null) },
                    label = { Text("Settings") },
                )
            }
        }
    ) { padding ->
        Box(Modifier.padding(padding).fillMaxSize().background(Surface)) {
            when (tab) {
                0 -> ProjectsTab(
                    estimates = estimates.filter { it.isActive },
                    customers = customers,
                    onCreate = { name, customerName, site, type ->
                        if (!ExplorerPolicy.canCreateProject(estimates.count { it.isActive })) return@ProjectsTab false
                        var customerId: String? = null
                        if (customerName.isNotBlank()) {
                            val existing = customers.find { it.name.equals(customerName, true) }
                            if (existing != null) {
                                customerId = existing.id
                            } else {
                                val c = ExplorerCustomer(name = customerName, site = site)
                                val next = customers + c
                                store.saveCustomers(next)
                                customers = next
                                customerId = c.id
                            }
                        }
                        val est = ExplorerEstimate(name = name, projectType = type, customerId = customerId)
                        val next = listOf(est) + estimates
                        store.saveEstimates(next)
                        refresh()
                        true
                    },
                    onDelete = { id ->
                        store.saveEstimates(estimates.filterNot { it.id == id })
                        refresh()
                    },
                )
                1 -> CatalogTab(
                    items = catalog,
                    onAdd = { item ->
                        if (!ExplorerPolicy.canCreateCatalogRecord(catalog.size)) return@CatalogTab false
                        val next = catalog + item
                        store.saveCatalog(next)
                        refresh()
                        true
                    },
                    onDelete = { id ->
                        store.saveCatalog(catalog.filterNot { it.id == id })
                        refresh()
                    },
                )
                2 -> CustomersTab(
                    customers = customers,
                    estimates = estimates,
                    onAdd = { name, site ->
                        val next = customers + ExplorerCustomer(name = name, site = site)
                        store.saveCustomers(next)
                        refresh()
                    },
                    onDelete = { id ->
                        store.saveCustomers(customers.filterNot { it.id == id })
                        refresh()
                    },
                )
                else -> SettingsTab(
                    labor = labor,
                    onSaveLabor = {
                        store.saveLaborRates(it)
                        refresh()
                    },
                )
            }
        }
    }
}

@Composable
private fun ProjectsTab(
    estimates: List<ExplorerEstimate>,
    customers: List<ExplorerCustomer>,
    onCreate: (String, String, String, String) -> Boolean,
    onDelete: (String) -> Unit,
) {
    var showNew by remember { mutableStateOf(false) }
    var limitAlert by remember { mutableStateOf(false) }
    val pipeline = estimates.sumOf { it.total }
    val money = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("SEP EXPLORER", color = BrandPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
            Column {
                Text("Projects", fontSize = 28.sp, fontWeight = FontWeight.Bold)
                Text(
                    "${estimates.size}/${ExplorerPolicy.activeProjectLimit} active · ${ExplorerPolicy.price}",
                    color = Muted,
                    fontSize = 13.sp,
                )
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("Pipeline", color = Muted, fontSize = 12.sp)
                Text(money.format(pipeline), color = BrandPrimary, fontWeight = FontWeight.Bold)
            }
        }
        Spacer(Modifier.height(12.dp))
        Button(
            onClick = {
                if (ExplorerPolicy.canCreateProject(estimates.size)) showNew = true
                else limitAlert = true
            },
            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
            modifier = Modifier.fillMaxWidth(),
        ) {
            Icon(Icons.Default.Add, null)
            Spacer(Modifier.width(8.dp))
            Text("New Project")
        }

        if (estimates.isEmpty()) {
            Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                Text("No projects yet — create an on-site estimate.", color = Muted)
            }
        } else {
            LazyColumn(Modifier.padding(top = 12.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                items(estimates, key = { it.id }) { est ->
                    val customer = customers.find { it.id == est.customerId }?.name ?: "No customer"
                    Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                        Column(Modifier.padding(16.dp).fillMaxWidth()) {
                            Text(est.name, fontWeight = FontWeight.Bold)
                            Text("$customer · ${est.projectType}", color = Muted, fontSize = 13.sp)
                            Text(money.format(est.total), color = BrandPrimary, fontWeight = FontWeight.SemiBold)
                            TextButton(onClick = { onDelete(est.id) }) { Text("Delete") }
                        }
                    }
                }
            }
        }
    }

    if (showNew) {
        NewProjectDialog(
            onDismiss = { showNew = false },
            onCreate = { name, customer, site, type ->
                if (onCreate(name, customer, site, type)) showNew = false
            },
        )
    }
    if (limitAlert) {
        AlertDialog(
            onDismissRequest = { limitAlert = false },
            confirmButton = { TextButton(onClick = { limitAlert = false }) { Text("OK") } },
            title = { Text("Project limit reached") },
            text = { Text("Explorer free tier allows up to ${ExplorerPolicy.activeProjectLimit} active projects.") },
        )
    }
}

@Composable
private fun NewProjectDialog(
    onDismiss: () -> Unit,
    onCreate: (String, String, String, String) -> Unit,
) {
    var name by remember { mutableStateOf("") }
    var customer by remember { mutableStateOf("") }
    var site by remember { mutableStateOf("") }
    var type by remember { mutableStateOf("Commercial") }

    AlertDialog(
        onDismissRequest = onDismiss,
        title = { Text("New Project") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                OutlinedTextField(name, { name = it }, label = { Text("Project name") }, singleLine = true)
                OutlinedTextField(customer, { customer = it }, label = { Text("Customer") }, singleLine = true)
                OutlinedTextField(site, { site = it }, label = { Text("Site") }, singleLine = true)
                listOf("Commercial", "Federal", "Union").forEach { t ->
                    Row(Modifier.clickable { type = t }, verticalAlignment = Alignment.CenterVertically) {
                        RadioButton(selected = type == t, onClick = { type = t })
                        Text(t)
                    }
                }
            }
        },
        confirmButton = {
            TextButton(
                enabled = name.isNotBlank(),
                onClick = { onCreate(name.trim(), customer.trim(), site.trim(), type) },
            ) { Text("Create") }
        },
        dismissButton = { TextButton(onClick = onDismiss) { Text("Cancel") } },
    )
}

@Composable
private fun CatalogTab(
    items: List<ExplorerCatalogItem>,
    onAdd: (ExplorerCatalogItem) -> Boolean,
    onDelete: (String) -> Unit,
) {
    var showNew by remember { mutableStateOf(false) }
    var limitAlert by remember { mutableStateOf(false) }
    var manufacturer by remember { mutableStateOf("") }
    var model by remember { mutableStateOf("") }
    var cost by remember { mutableStateOf("") }
    val money = remember { NumberFormat.getCurrencyInstance(Locale.US) }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Catalog", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Text("${items.size}/${ExplorerPolicy.catalogRecordLimit} catalog records", color = Muted)
        Spacer(Modifier.height(8.dp))
        Button(
            onClick = {
                if (ExplorerPolicy.canCreateCatalogRecord(items.size)) showNew = true
                else limitAlert = true
            },
            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Add Catalog Item") }

        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 12.dp)) {
            items(items, key = { it.id }) { item ->
                Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(item.displayName, fontWeight = FontWeight.Bold)
                        Text("${item.category} · ${money.format(item.cost)}", color = Muted, fontSize = 13.sp)
                        TextButton(onClick = { onDelete(item.id) }) { Text("Delete") }
                    }
                }
            }
        }
    }

    if (showNew) {
        AlertDialog(
            onDismissRequest = { showNew = false },
            title = { Text("Add Catalog Item") },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    OutlinedTextField(manufacturer, { manufacturer = it }, label = { Text("Manufacturer") })
                    OutlinedTextField(model, { model = it }, label = { Text("Model") })
                    OutlinedTextField(cost, { cost = it }, label = { Text("Cost") })
                }
            },
            confirmButton = {
                TextButton(
                    enabled = manufacturer.isNotBlank() && model.isNotBlank(),
                    onClick = {
                        val ok = onAdd(
                            ExplorerCatalogItem(
                                manufacturer = manufacturer.trim(),
                                model = model.trim(),
                                cost = cost.toDoubleOrNull() ?: 0.0,
                            )
                        )
                        if (ok) {
                            manufacturer = ""; model = ""; cost = ""
                            showNew = false
                        }
                    },
                ) { Text("Save") }
            },
            dismissButton = { TextButton(onClick = { showNew = false }) { Text("Cancel") } },
        )
    }
    if (limitAlert) {
        AlertDialog(
            onDismissRequest = { limitAlert = false },
            confirmButton = { TextButton(onClick = { limitAlert = false }) { Text("OK") } },
            title = { Text("Catalog limit reached") },
            text = { Text("Explorer free tier allows up to ${ExplorerPolicy.catalogRecordLimit} catalog records.") },
        )
    }
}

@Composable
private fun CustomersTab(
    customers: List<ExplorerCustomer>,
    estimates: List<ExplorerEstimate>,
    onAdd: (String, String) -> Unit,
    onDelete: (String) -> Unit,
) {
    var showNew by remember { mutableStateOf(false) }
    var name by remember { mutableStateOf("") }
    var site by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("Customers", fontSize = 28.sp, fontWeight = FontWeight.Bold)
        Button(
            onClick = { showNew = true },
            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
            modifier = Modifier.fillMaxWidth().padding(vertical = 8.dp),
        ) { Text("Add Customer") }
        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
            items(customers, key = { it.id }) { c ->
                val count = estimates.count { it.customerId == c.id }
                Card(colors = CardDefaults.cardColors(containerColor = Color.White)) {
                    Column(Modifier.padding(16.dp)) {
                        Text(c.name, fontWeight = FontWeight.Bold)
                        if (c.site.isNotBlank()) Text(c.site, color = Muted, fontSize = 13.sp)
                        Text("$count project(s)", color = BrandPrimary, fontSize = 12.sp)
                        TextButton(onClick = { onDelete(c.id) }) { Text("Delete") }
                    }
                }
            }
        }
    }
    if (showNew) {
        AlertDialog(
            onDismissRequest = { showNew = false },
            title = { Text("New Customer") },
            text = {
                Column {
                    OutlinedTextField(name, { name = it }, label = { Text("Name") })
                    OutlinedTextField(site, { site = it }, label = { Text("Site") })
                }
            },
            confirmButton = {
                TextButton(enabled = name.isNotBlank(), onClick = {
                    onAdd(name.trim(), site.trim())
                    name = ""; site = ""; showNew = false
                }) { Text("Add") }
            },
            dismissButton = { TextButton(onClick = { showNew = false }) { Text("Cancel") } },
        )
    }
}

@Composable
private fun SettingsTab(
    labor: List<ExplorerLaborRate>,
    onSaveLabor: (List<ExplorerLaborRate>) -> Unit,
) {
    var rates by remember(labor) { mutableStateOf(labor) }
    var showAdd by remember { mutableStateOf(false) }
    var limitAlert by remember { mutableStateOf(false) }
    var role by remember { mutableStateOf("") }
    var rateText by remember { mutableStateOf("") }

    Column(Modifier.fillMaxSize().padding(16.dp)) {
        Text("SEP EXPLORER", color = BrandPrimary, fontSize = 12.sp, fontWeight = FontWeight.Bold)
        Text("${ExplorerPolicy.tier} · ${ExplorerPolicy.price}", fontSize = 22.sp, fontWeight = FontWeight.Bold)
        Text("On-site estimating for security contractors.", color = Muted, fontSize = 13.sp)
        Spacer(Modifier.height(16.dp))
        Card(colors = CardDefaults.cardColors(containerColor = BrandTertiary)) {
            Column(Modifier.padding(16.dp)) {
                Text("Tier limits", fontWeight = FontWeight.Bold)
                Text("Projects: ${ExplorerPolicy.activeProjectLimit}")
                Text("Catalog: ${ExplorerPolicy.catalogRecordLimit}")
                Text("Labor: ${ExplorerPolicy.laborRecordLimit}")
                Spacer(Modifier.height(8.dp))
                Text("Not included: drawing, project management, finance", color = Muted, fontSize = 12.sp)
            }
        }
        Spacer(Modifier.height(16.dp))
        Text("Labor rates (${rates.size}/${ExplorerPolicy.laborRecordLimit})", fontWeight = FontWeight.Bold)
        rates.forEachIndexed { index, item ->
            Row(
                Modifier.fillMaxWidth().padding(vertical = 6.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Text(item.roleName, modifier = Modifier.weight(1f))
                OutlinedTextField(
                    value = item.hourlyRate.toString(),
                    onValueChange = { v ->
                        val n = v.toDoubleOrNull() ?: return@OutlinedTextField
                        rates = rates.toMutableList().also {
                            it[index] = item.copy(hourlyRate = n)
                        }
                    },
                    modifier = Modifier.width(100.dp),
                    singleLine = true,
                )
            }
        }
        Button(
            onClick = { onSaveLabor(rates) },
            colors = ButtonDefaults.buttonColors(containerColor = BrandPrimary),
            modifier = Modifier.fillMaxWidth(),
        ) { Text("Save Rates") }
        TextButton(onClick = {
            if (ExplorerPolicy.canCreateLaborRecord(rates.size)) showAdd = true
            else limitAlert = true
        }) { Text("Add labor role") }
    }

    if (showAdd) {
        AlertDialog(
            onDismissRequest = { showAdd = false },
            title = { Text("Add labor role") },
            text = {
                Column {
                    OutlinedTextField(role, { role = it }, label = { Text("Role") })
                    OutlinedTextField(rateText, { rateText = it }, label = { Text("Hourly rate") })
                }
            },
            confirmButton = {
                TextButton(enabled = role.isNotBlank(), onClick = {
                    val next = rates + ExplorerLaborRate(
                        roleName = role.trim(),
                        hourlyRate = rateText.toDoubleOrNull() ?: 0.0,
                        sortOrder = rates.size,
                    )
                    rates = next
                    onSaveLabor(next)
                    role = ""; rateText = ""; showAdd = false
                }) { Text("Add") }
            },
            dismissButton = { TextButton(onClick = { showAdd = false }) { Text("Cancel") } },
        )
    }
    if (limitAlert) {
        AlertDialog(
            onDismissRequest = { limitAlert = false },
            confirmButton = { TextButton(onClick = { limitAlert = false }) { Text("OK") } },
            title = { Text("Labor limit reached") },
            text = { Text("Explorer free tier allows up to ${ExplorerPolicy.laborRecordLimit} labor records.") },
        )
    }
}
