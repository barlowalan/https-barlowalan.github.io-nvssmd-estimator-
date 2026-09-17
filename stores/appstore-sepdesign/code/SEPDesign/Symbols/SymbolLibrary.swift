import SwiftUI
import Foundation

/// Industry-standard Visio / CAD-style security symbol library.
/// Inspired by System Surveyor, Axis Site Designer, ConnectCAD, and Visio stencils.
enum SymbolLibrary {
    static let all: [DesignSymbol] = ids + access + cctv + infrastructure + av + annotation + cadPrimitives

    static func symbols(for discipline: SystemDiscipline?) -> [DesignSymbol] {
        guard let discipline else { return all }
        return all.filter { $0.discipline == discipline || $0.discipline == nil }
    }

    static func symbol(id: String) -> DesignSymbol? {
        all.first { $0.id == id }
    }

    // MARK: IDS (intrusion)

    static let ids: [DesignSymbol] = [
        .init(id: "ids.panel", name: "Alarm Panel", discipline: .ids, category: "Control", visioName: "Intrusion Panel", cadBlock: "IDS_PANEL"),
        .init(id: "ids.keypad", name: "Keypad", discipline: .ids, category: "Control", visioName: "Keypad", cadBlock: "IDS_KEYPAD"),
        .init(id: "ids.door_contact", name: "Door Contact", discipline: .ids, category: "Sensor", visioName: "Door Contact", cadBlock: "IDS_DC"),
        .init(id: "ids.window_contact", name: "Window Contact", discipline: .ids, category: "Sensor", visioName: "Window Contact", cadBlock: "IDS_WC"),
        .init(id: "ids.pir", name: "PIR Motion", discipline: .ids, category: "Sensor", visioName: "PIR Detector", cadBlock: "IDS_PIR"),
        .init(id: "ids.glassbreak", name: "Glass Break", discipline: .ids, category: "Sensor", visioName: "Glass Break", cadBlock: "IDS_GB"),
        .init(id: "ids.smoke", name: "Smoke Detector", discipline: .fire, category: "Life Safety", visioName: "Smoke Detector", cadBlock: "FA_SMOKE"),
        .init(id: "ids.siren", name: "Siren / Strobe", discipline: .ids, category: "Notification", visioName: "Siren", cadBlock: "IDS_SIREN"),
        .init(id: "ids.duress", name: "Duress Button", discipline: .ids, category: "Sensor", visioName: "Hold-Up Button", cadBlock: "IDS_DURESS"),
    ]

    // MARK: Access control

    static let access: [DesignSymbol] = [
        .init(id: "acs.controller", name: "Door Controller", discipline: .access, category: "Control", visioName: "Access Controller", cadBlock: "ACS_CTRL"),
        .init(id: "acs.reader", name: "Card Reader", discipline: .access, category: "Reader", visioName: "Card Reader", cadBlock: "ACS_RDR"),
        .init(id: "acs.rex", name: "Request to Exit", discipline: .access, category: "Sensor", visioName: "REX", cadBlock: "ACS_REX"),
        .init(id: "acs.lock", name: "Electric Lock", discipline: .access, category: "Locking", visioName: "Electric Strike", cadBlock: "ACS_LOCK"),
        .init(id: "acs.maglock", name: "Maglock", discipline: .access, category: "Locking", visioName: "Maglock", cadBlock: "ACS_MAG"),
        .init(id: "acs.rex_button", name: "Exit Button", discipline: .access, category: "Reader", visioName: "Exit Button", cadBlock: "ACS_BTN"),
        .init(id: "acs.intercom", name: "Door Station", discipline: .access, category: "Intercom", visioName: "Door Station", cadBlock: "ACS_DOORST"),
        .init(id: "acs.turnstile", name: "Turnstile", discipline: .access, category: "Barrier", visioName: "Turnstile", cadBlock: "ACS_TURN"),
    ]

    // MARK: CCTV / video (JVSG, Axis, IPVM)

    static let cctv: [DesignSymbol] = [
        .init(id: "cam.dome", name: "Dome Camera", discipline: .cctv, category: "Camera", visioName: "Dome Camera", cadBlock: "CAM_DOME"),
        .init(id: "cam.bullet", name: "Bullet Camera", discipline: .cctv, category: "Camera", visioName: "Bullet Camera", cadBlock: "CAM_BULLET"),
        .init(id: "cam.ptz", name: "PTZ Camera", discipline: .cctv, category: "Camera", visioName: "PTZ Camera", cadBlock: "CAM_PTZ"),
        .init(id: "cam.fisheye", name: "Fisheye Camera", discipline: .cctv, category: "Camera", visioName: "Fisheye", cadBlock: "CAM_FISH"),
        .init(id: "cam.multi", name: "Multi-Sensor", discipline: .cctv, category: "Camera", visioName: "Multi-Sensor Cam", cadBlock: "CAM_MULTI"),
        .init(id: "cam.nvr", name: "NVR / VMS", discipline: .cctv, category: "Recording", visioName: "NVR", cadBlock: "CAM_NVR"),
        .init(id: "cam.encoder", name: "Encoder", discipline: .cctv, category: "Recording", visioName: "Video Encoder", cadBlock: "CAM_ENC"),
        .init(id: "cam.monitor", name: "Monitor Wall", discipline: .cctv, category: "Display", visioName: "Monitor", cadBlock: "CAM_MON"),
    ]

    // MARK: Infrastructure

    static let infrastructure: [DesignSymbol] = [
        .init(id: "infra.switch", name: "Network Switch", discipline: .infrastructure, category: "Network", visioName: "Ethernet Switch", cadBlock: "NET_SW"),
        .init(id: "infra.poe", name: "PoE Switch", discipline: .infrastructure, category: "Network", visioName: "PoE Switch", cadBlock: "NET_POE"),
        .init(id: "infra.router", name: "Router / Firewall", discipline: .infrastructure, category: "Network", visioName: "Router", cadBlock: "NET_RTR"),
        .init(id: "infra.ap", name: "Wireless AP", discipline: .infrastructure, category: "Network", visioName: "Wireless AP", cadBlock: "NET_AP"),
        .init(id: "infra.ups", name: "UPS", discipline: .infrastructure, category: "Power", visioName: "UPS", cadBlock: "PWR_UPS"),
        .init(id: "infra.rack", name: "Equipment Rack", discipline: .infrastructure, category: "Pathway", visioName: "Rack", cadBlock: "RACK"),
        .init(id: "infra.idf", name: "IDF / MDF", discipline: .infrastructure, category: "Pathway", visioName: "Telecom Closet", cadBlock: "IDF"),
        .init(id: "infra.conduit", name: "Conduit Run", discipline: .infrastructure, category: "Pathway", visioName: "Conduit", cadBlock: "COND"),
        .init(id: "infra.jbox", name: "Junction Box", discipline: .infrastructure, category: "Pathway", visioName: "J-Box", cadBlock: "JBOX"),
        .init(id: "infra.pull", name: "Pull Point", discipline: .infrastructure, category: "Pathway", visioName: "Pull Box", cadBlock: "PULL"),
    ]

    // MARK: AV / Intercom (XTEN-AV)

    static let av: [DesignSymbol] = [
        .init(id: "av.speaker", name: "Ceiling Speaker", discipline: .av, category: "Audio", visioName: "Speaker", cadBlock: "AV_SPK"),
        .init(id: "av.amp", name: "Amplifier", discipline: .av, category: "Audio", visioName: "Amplifier", cadBlock: "AV_AMP"),
        .init(id: "av.dsp", name: "DSP", discipline: .av, category: "Audio", visioName: "DSP", cadBlock: "AV_DSP"),
        .init(id: "av.display", name: "Display", discipline: .av, category: "Video", visioName: "Display", cadBlock: "AV_DISP"),
        .init(id: "av.matrix", name: "AV Matrix", discipline: .av, category: "Video", visioName: "Matrix Switcher", cadBlock: "AV_MX"),
        .init(id: "av.control", name: "Control Processor", discipline: .av, category: "Control", visioName: "Control Proc", cadBlock: "AV_CTRL"),
    ]

    // MARK: Annotation / Visio helpers

    static let annotation: [DesignSymbol] = [
        .init(id: "ann.text", name: "Text Note", discipline: nil, category: "Annotation", visioName: "Text", cadBlock: "TEXT"),
        .init(id: "ann.north", name: "North Arrow", discipline: nil, category: "Annotation", visioName: "North Arrow", cadBlock: "NORTH"),
        .init(id: "ann.scale", name: "Scale Bar", discipline: nil, category: "Annotation", visioName: "Scale", cadBlock: "SCALE"),
        .init(id: "ann.title", name: "Title Block", discipline: nil, category: "Annotation", visioName: "Title Block", cadBlock: "TITLE"),
        .init(id: "ann.room", name: "Room Label", discipline: nil, category: "Annotation", visioName: "Room Tag", cadBlock: "ROOM"),
    ]

    // MARK: CAD primitives

    static let cadPrimitives: [DesignSymbol] = [
        .init(id: "cad.line", name: "Line", discipline: nil, category: "CAD", visioName: "Line", cadBlock: "LINE"),
        .init(id: "cad.polyline", name: "Polyline", discipline: nil, category: "CAD", visioName: "Polyline", cadBlock: "PLINE"),
        .init(id: "cad.rect", name: "Rectangle", discipline: nil, category: "CAD", visioName: "Rectangle", cadBlock: "RECT"),
        .init(id: "cad.circle", name: "Circle", discipline: nil, category: "CAD", visioName: "Circle", cadBlock: "CIRCLE"),
        .init(id: "cad.wall", name: "Wall", discipline: nil, category: "CAD", visioName: "Wall", cadBlock: "WALL"),
        .init(id: "cad.door", name: "Door Swing", discipline: nil, category: "CAD", visioName: "Door", cadBlock: "DOOR"),
        .init(id: "cad.window", name: "Window", discipline: nil, category: "CAD", visioName: "Window", cadBlock: "WINDOW"),
        .init(id: "cad.dimension", name: "Dimension", discipline: nil, category: "CAD", visioName: "Dimension", cadBlock: "DIM"),
    ]
}

struct DesignSymbol: Identifiable, Hashable {
    let id: String
    let name: String
    let discipline: SystemDiscipline?
    let category: String
    let visioName: String
    let cadBlock: String
}

/// Renders Visio/CAD-style device glyphs for the canvas and library.
struct SymbolGlyphView: View {
    let symbolID: String
    var size: CGFloat = 36
    var tint: Color = DesignTheme.brandNavy

    var body: some View {
        Canvas { context, canvasSize in
            let rect = CGRect(origin: .zero, size: canvasSize).insetBy(dx: 2, dy: 2)
            draw(symbolID: symbolID, in: rect, context: &context)
        }
        .frame(width: size, height: size)
        .foregroundStyle(tint)
    }

    private func draw(symbolID: String, in rect: CGRect, context: inout GraphicsContext) {
        var path = Path()
        let stroke = StrokeStyle(lineWidth: max(1.5, size / 24), lineCap: .round, lineJoin: .round)
        let mid = CGPoint(x: rect.midX, y: rect.midY)

        switch symbolID {
        case "cam.dome", "cam.fisheye":
            path.addEllipse(in: rect.insetBy(dx: rect.width * 0.15, dy: rect.height * 0.15))
            context.stroke(path, with: .color(tint), style: stroke)
            var cross = Path()
            cross.move(to: CGPoint(x: mid.x - 4, y: mid.y))
            cross.addLine(to: CGPoint(x: mid.x + 4, y: mid.y))
            cross.move(to: CGPoint(x: mid.x, y: mid.y - 4))
            cross.addLine(to: CGPoint(x: mid.x, y: mid.y + 4))
            context.stroke(cross, with: .color(tint), style: stroke)

        case "cam.bullet":
            path.addRoundedRect(in: CGRect(x: rect.minX, y: mid.y - 6, width: rect.width * 0.7, height: 12), cornerSize: CGSize(width: 3, height: 3))
            path.addEllipse(in: CGRect(x: rect.maxX - 14, y: mid.y - 7, width: 14, height: 14))
            context.stroke(path, with: .color(tint), style: stroke)

        case "cam.ptz":
            path.addEllipse(in: rect.insetBy(dx: 4, dy: 4))
            path.move(to: mid)
            path.addLine(to: CGPoint(x: rect.maxX - 2, y: mid.y))
            context.stroke(path, with: .color(tint), style: stroke)

        case "acs.reader", "acs.rex_button":
            path.addRoundedRect(in: rect.insetBy(dx: 6, dy: 2), cornerSize: CGSize(width: 4, height: 4))
            context.stroke(path, with: .color(tint), style: stroke)
            var inner = Path()
            inner.addEllipse(in: CGRect(x: mid.x - 4, y: mid.y - 4, width: 8, height: 8))
            context.stroke(inner, with: .color(tint), style: stroke)

        case "acs.lock", "acs.maglock":
            path.addRect(CGRect(x: mid.x - 8, y: mid.y - 2, width: 16, height: 12))
            path.addArc(center: CGPoint(x: mid.x, y: mid.y - 2), radius: 7, startAngle: .degrees(180), endAngle: .degrees(0), clockwise: false)
            context.stroke(path, with: .color(tint), style: stroke)

        case "ids.pir", "ids.glassbreak":
            path.move(to: CGPoint(x: mid.x, y: rect.minY + 4))
            path.addLine(to: CGPoint(x: rect.maxX - 4, y: rect.maxY - 4))
            path.addLine(to: CGPoint(x: rect.minX + 4, y: rect.maxY - 4))
            path.closeSubpath()
            context.stroke(path, with: .color(tint), style: stroke)

        case "ids.door_contact", "ids.window_contact":
            path.addRect(CGRect(x: rect.minX + 4, y: mid.y - 3, width: 10, height: 6))
            path.addRect(CGRect(x: rect.maxX - 14, y: mid.y - 3, width: 10, height: 6))
            context.stroke(path, with: .color(tint), style: stroke)

        case "ids.panel", "acs.controller", "cam.nvr", "infra.rack", "infra.switch", "infra.poe":
            path.addRoundedRect(in: rect.insetBy(dx: 4, dy: 4), cornerSize: CGSize(width: 3, height: 3))
            var vents = Path()
            for i in 0..<3 {
                let y = rect.minY + 10 + CGFloat(i) * 6
                vents.move(to: CGPoint(x: rect.minX + 10, y: y))
                vents.addLine(to: CGPoint(x: rect.maxX - 10, y: y))
            }
            context.stroke(path, with: .color(tint), style: stroke)
            context.stroke(vents, with: .color(tint), style: StrokeStyle(lineWidth: 1))

        case "infra.ap", "av.speaker":
            path.addEllipse(in: rect.insetBy(dx: 8, dy: 8))
            context.stroke(path, with: .color(tint), style: stroke)
            for r in [10, 14] as [CGFloat] {
                var ring = Path()
                ring.addArc(center: mid, radius: r, startAngle: .degrees(-40), endAngle: .degrees(40), clockwise: false)
                context.stroke(ring, with: .color(tint), style: stroke)
            }

        case "cad.wall":
            path.move(to: CGPoint(x: rect.minX, y: mid.y - 3))
            path.addLine(to: CGPoint(x: rect.maxX, y: mid.y - 3))
            path.move(to: CGPoint(x: rect.minX, y: mid.y + 3))
            path.addLine(to: CGPoint(x: rect.maxX, y: mid.y + 3))
            context.stroke(path, with: .color(tint), style: StrokeStyle(lineWidth: 2))

        case "cad.door":
            path.move(to: CGPoint(x: rect.minX + 4, y: rect.maxY - 6))
            path.addLine(to: CGPoint(x: rect.minX + 4, y: rect.minY + 6))
            path.addArc(center: CGPoint(x: rect.minX + 4, y: rect.maxY - 6), radius: rect.width * 0.7, startAngle: .degrees(-90), endAngle: .degrees(0), clockwise: false)
            context.stroke(path, with: .color(tint), style: stroke)

        case "ann.north":
            path.move(to: CGPoint(x: mid.x, y: rect.minY + 2))
            path.addLine(to: CGPoint(x: mid.x - 8, y: rect.maxY - 4))
            path.addLine(to: CGPoint(x: mid.x, y: rect.maxY - 10))
            path.addLine(to: CGPoint(x: mid.x + 8, y: rect.maxY - 4))
            path.closeSubpath()
            context.fill(path, with: .color(tint))

        default:
            path.addRoundedRect(in: rect.insetBy(dx: 4, dy: 4), cornerSize: CGSize(width: 4, height: 4))
            context.stroke(path, with: .color(tint), style: stroke)
            var diag = Path()
            diag.move(to: CGPoint(x: rect.minX + 8, y: rect.maxY - 8))
            diag.addLine(to: CGPoint(x: rect.maxX - 8, y: rect.minY + 8))
            context.stroke(diag, with: .color(tint), style: stroke)
        }
    }
}

/// Small Visio / AutoCAD badge used in the library chrome.
struct FormatBadge: View {
    enum Format { case visio, cad, pdf }
    let format: Format

    var body: some View {
        Text(label)
            .font(.system(size: 9, weight: .bold, design: .monospaced))
            .foregroundStyle(.white)
            .padding(.horizontal, 5)
            .padding(.vertical, 2)
            .background(color, in: RoundedRectangle(cornerRadius: 3))
    }

    private var label: String {
        switch format {
        case .visio: return "VSD"
        case .cad: return "CAD"
        case .pdf: return "PDF"
        }
    }

    private var color: Color {
        switch format {
        case .visio: return Color(red: 0.15, green: 0.40, blue: 0.70)
        case .cad: return Color(red: 0.75, green: 0.25, blue: 0.15)
        case .pdf: return Color(red: 0.70, green: 0.15, blue: 0.15)
        }
    }
}
