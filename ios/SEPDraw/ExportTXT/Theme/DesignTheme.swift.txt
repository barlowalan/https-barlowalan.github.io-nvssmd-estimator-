import SwiftUI

/// Security Estimator Pro · Design visual system (iPad-first).
enum DesignTheme {
    static let surface = Color(red: 0.957, green: 0.965, blue: 0.973)
    static let surfaceSecondary = Color.white
    static let brandNavy = Color(red: 0.039, green: 0.106, blue: 0.227)
    static let brandGold = Color(red: 0.773, green: 0.627, blue: 0.349)
    static let brandPrimary = brandGold
    static let brandAccent = Color(red: 0.180, green: 0.490, blue: 0.620)
    static let brandTertiary = Color(red: 0.953, green: 0.922, blue: 0.843)
    static let onSurface = brandNavy
    static let muted = Color(red: 0.420, green: 0.451, blue: 0.502)
    static let canvasGrid = Color(red: 0.880, green: 0.900, blue: 0.920)
    static let layerIDS = Color(red: 0.85, green: 0.25, blue: 0.25)
    static let layerACS = Color(red: 0.20, green: 0.55, blue: 0.85)
    static let layerCCTV = Color(red: 0.25, green: 0.70, blue: 0.45)
    static let layerInfra = Color(red: 0.70, green: 0.50, blue: 0.20)
    static let layerAV = Color(red: 0.55, green: 0.35, blue: 0.75)
    static let success = Color(red: 0.20, green: 0.70, blue: 0.35)
    static let warning = Color(red: 0.95, green: 0.62, blue: 0.04)
    static let error = Color(red: 1.0, green: 0.27, blue: 0.23)

    static let corner: CGFloat = 12
    static let canvasMinZoom: CGFloat = 0.25
    static let canvasMaxZoom: CGFloat = 4.0
}

enum SystemDiscipline: String, Codable, CaseIterable, Identifiable {
    case ids = "IDS"
    case access = "Access Control"
    case cctv = "Video Surveillance"
    case infrastructure = "Infrastructure"
    case av = "AV / Intercom"
    case fire = "Fire / Life Safety"

    var id: String { rawValue }

    var color: Color {
        switch self {
        case .ids: return DesignTheme.layerIDS
        case .access: return DesignTheme.layerACS
        case .cctv: return DesignTheme.layerCCTV
        case .infrastructure: return DesignTheme.layerInfra
        case .av: return DesignTheme.layerAV
        case .fire: return DesignTheme.error
        }
    }

    var symbolName: String {
        switch self {
        case .ids: return "shield.lefthalf.filled"
        case .access: return "key.fill"
        case .cctv: return "video.fill"
        case .infrastructure: return "cable.connector"
        case .av: return "speaker.wave.2.fill"
        case .fire: return "flame.fill"
        }
    }
}
