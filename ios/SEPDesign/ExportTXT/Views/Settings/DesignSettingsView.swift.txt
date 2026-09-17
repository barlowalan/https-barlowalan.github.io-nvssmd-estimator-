import SwiftUI
import SwiftData

struct DesignSettingsView: View {
    var body: some View {
        Form {
            Section("SEP Design") {
                LabeledContent("Product", value: DesignPolicy.productName)
                LabeledContent("Version", value: DesignPolicy.version)
                LabeledContent("Bundle ID", value: DesignPolicy.bundleId)
                LabeledContent("Publisher", value: DesignPolicy.legalName)
            }
            Section("Capabilities") {
                Label("Drawing & Visio/CAD symbols", systemImage: "checkmark.circle.fill")
                Label("Camera coverage (JVSG / Axis)", systemImage: "checkmark.circle.fill")
                Label("Schematics (ConnectCAD / XTEN-AV)", systemImage: "checkmark.circle.fill")
                Label("Estimating (ConEst / Jetbuilt / D-Tools)", systemImage: "checkmark.circle.fill")
                Label("Documents (Simply Wise / SiteOwl / Bluebeam)", systemImage: "checkmark.circle.fill")
                Label("Import Visio · AutoCAD · PDF", systemImage: "checkmark.circle.fill")
                Label("Export PDF · DXF · Visio XML · BOM", systemImage: "checkmark.circle.fill")
            }
            .foregroundStyle(DesignTheme.success)
            Section("Import formats") {
                Text(DesignPolicy.supportedImport.joined(separator: ", "))
                    .font(.caption.monospaced())
            }
            Section("Export formats") {
                Text(DesignPolicy.supportedExport.joined(separator: ", "))
                    .font(.caption.monospaced())
            }
            Section("Privacy") {
                Text("SEP Design stores projects on-device with SwiftData. Files you import stay in your project vault. No tracking SDKs are embedded.")
                    .font(.caption)
                    .foregroundStyle(DesignTheme.muted)
            }
        }
        .navigationTitle("Settings")
    }
}
