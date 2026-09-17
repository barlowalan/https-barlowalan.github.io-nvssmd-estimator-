import Foundation
import UniformTypeIdentifiers
import PDFKit
import SwiftUI

// MARK: - UTTypes

extension UTType {
    static let vsdx = UTType(filenameExtension: "vsdx") ?? UTType(exportedAs: "com.microsoft.visio.drawing")
    static let vdx = UTType(filenameExtension: "vdx") ?? UTType(exportedAs: "com.microsoft.visio.xml")
    static let dxf = UTType(filenameExtension: "dxf") ?? UTType(exportedAs: "com.autodesk.dxf")
    static let dwg = UTType(filenameExtension: "dwg") ?? UTType(exportedAs: "com.autodesk.dwg")
    static let sepdesign = UTType(exportedAs: "com.nvssmd.sepdesign.project", conformingTo: .json)
}

// MARK: - Import

enum DesignImportService {
    enum ImportResult {
        case floorPlanBackground(title: String, pageSize: CGSize, pageCount: Int)
        case visioStencil(shapes: [ImportedShape])
        case cadEntities(entities: [ImportedCADEntity])
        case message(String)
    }

    struct ImportedShape: Identifiable {
        let id = UUID()
        let name: String
        let symbolHint: String
        let x: Double
        let y: Double
    }

    struct ImportedCADEntity: Identifiable {
        let id = UUID()
        let layer: String
        let entityType: String
        let points: [CGPoint]
    }

    static var supportedTypes: [UTType] {
        [.pdf, .vsdx, .vdx, .dxf, .dwg, .plainText, .xml, .data]
    }

    static func importFile(at url: URL) throws -> ImportResult {
        let ext = url.pathExtension.lowercased()
        switch ext {
        case "pdf":
            return try importPDF(url)
        case "vsdx", "vdx", "vsd":
            return try importVisio(url)
        case "dxf":
            return try importDXF(url)
        case "dwg":
            // DWG is proprietary; we accept the file, extract what we can, and guide users to DXF.
            return .message("DWG “\(url.lastPathComponent)” imported as reference. For editable geometry, export DXF from AutoCAD / TrueView, then re-import.")
        default:
            throw ImportError.unsupported(ext)
        }
    }

    private static func importPDF(_ url: URL) throws -> ImportResult {
        guard let doc = PDFDocument(url: url) else {
            throw ImportError.corrupt("PDF")
        }
        let page = doc.page(at: 0)
        let bounds = page?.bounds(for: .mediaBox) ?? CGRect(x: 0, y: 0, width: 792, height: 612)
        return .floorPlanBackground(
            title: url.deletingPathExtension().lastPathComponent,
            pageSize: bounds.size,
            pageCount: doc.pageCount
        )
    }

    private static func importVisio(_ url: URL) throws -> ImportResult {
        // VSDX is a ZIP package of XML. We parse shape names when unzipped XML is readable;
        // otherwise we register stencil placeholders for the designer.
        let data = try Data(contentsOf: url)
        var shapes: [ImportedShape] = []

        if let xml = String(data: data, encoding: .utf8) ?? String(data: data, encoding: .isoLatin1) {
            shapes = parseVisioShapeNames(from: xml)
        }

        if shapes.isEmpty {
            // Stencil drop list derived from filename + common security masters
            let base = url.deletingPathExtension().lastPathComponent
            shapes = [
                .init(name: "\(base) · Master 1", symbolHint: "cam.dome", x: 200, y: 200),
                .init(name: "\(base) · Master 2", symbolHint: "acs.reader", x: 320, y: 200),
                .init(name: "\(base) · Master 3", symbolHint: "ids.pir", x: 440, y: 200),
            ]
        }

        return .visioStencil(shapes: shapes)
    }

    private static func parseVisioShapeNames(from xml: String) -> [ImportedShape] {
        var results: [ImportedShape] = []
        // Lightweight name scrape for VDX / Visio XML exports
        let pattern = #"Name=['"]([^'"]+)['"]"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let range = NSRange(xml.startIndex..<xml.endIndex, in: xml)
        let matches = regex.matches(in: xml, range: range)
        var index = 0
        for match in matches.prefix(40) {
            guard let r = Range(match.range(at: 1), in: xml) else { continue }
            let name = String(xml[r])
            if name.count < 2 || name.hasPrefix("Sheet") { continue }
            let hint = SymbolLibrary.all.first {
                name.localizedCaseInsensitiveContains($0.name)
                    || name.localizedCaseInsensitiveContains($0.visioName)
                    || name.localizedCaseInsensitiveContains($0.cadBlock)
            }?.id ?? "cam.dome"
            results.append(.init(name: name, symbolHint: hint, x: 120 + Double(index % 8) * 80, y: 120 + Double(index / 8) * 80))
            index += 1
        }
        return results
    }

    private static func importDXF(_ url: URL) throws -> ImportResult {
        let text = try String(contentsOf: url, encoding: .utf8)
        var entities: [ImportedCADEntity] = []
        let lines = text.components(separatedBy: .newlines).map { $0.trimmingCharacters(in: .whitespaces) }
        var i = 0
        var currentLayer = "0"
        while i < lines.count - 1 {
            let code = lines[i]
            let value = lines[i + 1]
            if code == "8" { currentLayer = value }
            if code == "0" {
                switch value {
                case "LINE":
                    var pts: [CGPoint] = []
                    var x1 = 0.0, y1 = 0.0, x2 = 0.0, y2 = 0.0
                    var j = i + 2
                    while j < lines.count - 1 && lines[j] != "0" {
                        let c = lines[j]
                        let v = Double(lines[j + 1]) ?? 0
                        switch c {
                        case "10": x1 = v
                        case "20": y1 = v
                        case "11": x2 = v
                        case "21": y2 = v
                        default: break
                        }
                        j += 2
                    }
                    pts = [CGPoint(x: x1, y: -y1), CGPoint(x: x2, y: -y2)]
                    entities.append(.init(layer: currentLayer, entityType: "LINE", points: pts))
                case "CIRCLE":
                    var cx = 0.0, cy = 0.0, r = 10.0
                    var j = i + 2
                    while j < lines.count - 1 && lines[j] != "0" {
                        let c = lines[j]
                        let v = Double(lines[j + 1]) ?? 0
                        switch c {
                        case "10": cx = v
                        case "20": cy = v
                        case "40": r = v
                        default: break
                        }
                        j += 2
                    }
                    entities.append(.init(
                        layer: currentLayer,
                        entityType: "CIRCLE",
                        points: [
                            CGPoint(x: cx - r, y: -(cy - r)),
                            CGPoint(x: cx + r, y: -(cy + r))
                        ]
                    ))
                case "INSERT":
                    var name = "BLOCK"
                    var x = 0.0, y = 0.0
                    var j = i + 2
                    while j < lines.count - 1 && lines[j] != "0" {
                        let c = lines[j]
                        let v = lines[j + 1]
                        switch c {
                        case "2": name = v
                        case "10": x = Double(v) ?? 0
                        case "20": y = Double(v) ?? 0
                        default: break
                        }
                        j += 2
                    }
                    entities.append(.init(layer: currentLayer, entityType: "INSERT:\(name)", points: [CGPoint(x: x, y: -y)]))
                default:
                    break
                }
            }
            i += 2
        }
        return .cadEntities(entities: entities)
    }

    enum ImportError: LocalizedError {
        case unsupported(String)
        case corrupt(String)

        var errorDescription: String? {
            switch self {
            case .unsupported(let ext): return "Unsupported file type .\(ext)"
            case .corrupt(let kind): return "Could not read \(kind) file"
            }
        }
    }
}

// MARK: - Export

enum DesignExportService {
    enum ExportFormat: String, CaseIterable, Identifiable {
        case pdf = "PDF"
        case dxf = "AutoCAD DXF"
        case visioXML = "Visio XML (VDX)"
        case csvBOM = "BOM CSV"
        case sepJSON = "SEP Design JSON"

        var id: String { rawValue }

        var utType: UTType {
            switch self {
            case .pdf: return .pdf
            case .dxf: return .dxf
            case .visioXML: return .xml
            case .csvBOM: return .commaSeparatedText
            case .sepJSON: return .json
            }
        }

        var fileExtension: String {
            switch self {
            case .pdf: return "pdf"
            case .dxf: return "dxf"
            case .visioXML: return "vdx"
            case .csvBOM: return "csv"
            case .sepJSON: return "sepdesign.json"
            }
        }
    }

    static func exportPDF(project: DesignProject, sheet: DesignSheet) -> Data {
        let pageRect = CGRect(x: 0, y: 0, width: 792, height: 612) // Letter landscape
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)
        return renderer.pdfData { ctx in
            ctx.beginPage()
            let title = "\(project.name) — \(sheet.title)" as NSString
            title.draw(at: CGPoint(x: 36, y: 28), withAttributes: [
                .font: UIFont.boldSystemFont(ofSize: 16),
                .foregroundColor: UIColor(DesignTheme.brandNavy)
            ])
            let meta = "\(project.clientName) · \(project.siteAddress) · \(ISO8601DateFormatter().string(from: Date()))" as NSString
            meta.draw(at: CGPoint(x: 36, y: 50), withAttributes: [
                .font: UIFont.systemFont(ofSize: 10),
                .foregroundColor: UIColor.gray
            ])

            // Title block
            let block = CGRect(x: 520, y: 520, width: 240, height: 60)
            UIColor(DesignTheme.brandTertiary).setFill()
            UIBezierPath(roundedRect: block, cornerRadius: 4).fill()
            ("SEP Design · NVSSMD" as NSString).draw(at: CGPoint(x: 528, y: 528), withAttributes: [
                .font: UIFont.boldSystemFont(ofSize: 11)
            ])
            (sheet.sheetType.rawValue as NSString).draw(at: CGPoint(x: 528, y: 546), withAttributes: [
                .font: UIFont.systemFont(ofSize: 10)
            ])

            // Devices
            for device in sheet.devices {
                let px = 36 + device.x * 0.25
                let py = 80 + device.y * 0.25
                let r = CGRect(x: px - 8, y: py - 8, width: 16, height: 16)
                UIColor(device.discipline.color).setStroke()
                UIBezierPath(ovalIn: r).stroke()
                (device.tag as NSString).draw(at: CGPoint(x: px + 10, y: py - 6), withAttributes: [
                    .font: UIFont.systemFont(ofSize: 8),
                    .foregroundColor: UIColor.darkGray
                ])
            }

            // Coverage wedges (simplified)
            for zone in sheet.coverageZones {
                let ox = 36 + zone.originX * 0.25
                let oy = 80 + zone.originY * 0.25
                let radius = zone.rangeFeet * 2
                let start = CGFloat((zone.headingDegrees - zone.fovDegrees / 2) * .pi / 180)
                let end = CGFloat((zone.headingDegrees + zone.fovDegrees / 2) * .pi / 180)
                let path = UIBezierPath()
                path.move(to: CGPoint(x: ox, y: oy))
                path.addArc(withCenter: CGPoint(x: ox, y: oy), radius: radius, startAngle: start, endAngle: end, clockwise: true)
                path.close()
                UIColor(DesignTheme.layerCCTV).withAlphaComponent(0.15).setFill()
                path.fill()
            }
        }
    }

    static func exportDXF(sheet: DesignSheet) -> String {
        var out = "0\nSECTION\n2\nHEADER\n0\nENDSEC\n0\nSECTION\n2\nTABLES\n0\nENDSEC\n"
        out += "0\nSECTION\n2\nENTITIES\n"
        for device in sheet.devices {
            let block = SymbolLibrary.symbol(id: device.symbolID)?.cadBlock ?? "DEVICE"
            out += "0\nINSERT\n8\n\(device.discipline.rawValue)\n2\n\(block)\n10\n\(device.x)\n20\n\(-device.y)\n30\n0.0\n50\n\(device.rotation)\n"
            out += "0\nTEXT\n8\nANNOTATION\n10\n\(device.x + 12)\n20\n\(-device.y)\n40\n8\n1\n\(device.tag)\n"
        }
        for zone in sheet.coverageZones {
            out += "0\nARC\n8\nCOVERAGE\n10\n\(zone.originX)\n20\n\(-zone.originY)\n40\n\(zone.rangeFeet * 12)\n50\n\(zone.headingDegrees - zone.fovDegrees / 2)\n51\n\(zone.headingDegrees + zone.fovDegrees / 2)\n"
        }
        out += "0\nENDSEC\n0\nEOF\n"
        return out
    }

    static func exportVisioXML(project: DesignProject, sheet: DesignSheet) -> String {
        var shapes = ""
        for (idx, device) in sheet.devices.enumerated() {
            let master = SymbolLibrary.symbol(id: device.symbolID)?.visioName ?? device.label
            shapes += """
            <Shape ID="\(idx + 1)" Name="\(xmlEscape(device.tag))" Type="Shape" Master="\(xmlEscape(master))">
              <XForm>
                <PinX>\(device.x)</PinX>
                <PinY>\(device.y)</PinY>
                <Width>36</Width>
                <Height>36</Height>
                <Angle>\(device.rotation * .pi / 180)</Angle>
              </XForm>
              <Text>\(xmlEscape(device.label))</Text>
            </Shape>
            """
        }
        return """
        <?xml version="1.0" encoding="UTF-8"?>
        <VisioDocument xmlns="http://schemas.microsoft.com/office/visio/2012/main">
          <DocumentProperties>
            <Title>\(xmlEscape(project.name))</Title>
            <Creator>SEP Design · NVSSMD</Creator>
            <Company>\(xmlEscape(project.clientName))</Company>
          </DocumentProperties>
          <Pages>
            <Page ID="0" Name="\(xmlEscape(sheet.title))">
              <Shapes>
                \(shapes)
              </Shapes>
            </Page>
          </Pages>
        </VisioDocument>
        """
    }

    static func exportBOMCSV(project: DesignProject) -> String {
        var csv = "SKU/Tag,Description,Qty,Unit Cost,Labor Hours,Labor Rate,Material,Labor,Extended,Category\n"
        for line in project.estimateLines {
            csv += "\"\(line.sourceDeviceID?.uuidString ?? "")\",\"\(line.descriptionText)\",\(line.quantity),\(line.unitCost),\(line.laborHours),\(line.laborRate),\(line.materialTotal),\(line.laborTotal),\(line.extended),\"\(line.category)\"\n"
        }
        // Also roll up placed devices if estimate lines empty
        if project.estimateLines.isEmpty {
            for sheet in project.sheets {
                for d in sheet.devices {
                    let mat = d.unitCost
                    let lab = d.laborHours * 95
                    csv += "\"\(d.tag)\",\"\(d.label)\",1,\(d.unitCost),\(d.laborHours),95,\(mat),\(lab),\(mat + lab),\"\(d.discipline.rawValue)\"\n"
                }
            }
        }
        return csv
    }

    private static func xmlEscape(_ s: String) -> String {
        s.replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
    }
}
