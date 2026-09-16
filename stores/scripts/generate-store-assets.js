#!/usr/bin/env node
/**
 * Generate Play feature graphic + icon-512 and screenshot placeholders from logo.
 */
const { createCanvas, loadImage } = (() => {
  try {
    return require("canvas");
  } catch {
    return { createCanvas: null, loadImage: null };
  }
})();

const fs = require("fs");
const path = require("path");

async function withPillowFallback() {
  const { spawnSync } = require("child_process");
  const script = `
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
ROOT = Path(${JSON.stringify(path.resolve(__dirname, "../.."))})
logo = Image.open(ROOT / "frontend/assets/images/sep-logo.png").convert("RGBA")
NAVY = (10, 27, 58, 255)
GOLD = (197, 160, 89, 255)

def ensure(p):
    p.parent.mkdir(parents=True, exist_ok=True)

# Play icon 512
icon = Image.new("RGBA", (512, 512), NAVY)
l = logo.copy(); l.thumbnail((440, 440), Image.Resampling.LANCZOS)
icon.paste(l, ((512-l.width)//2, (512-l.height)//2), l)
p = ROOT / "stores/playstore/assets/icon-512.png"; ensure(p); icon.save(p)

# Feature graphic 1024x500
fg = Image.new("RGBA", (1024, 500), NAVY)
l2 = logo.copy(); l2.thumbnail((360, 360), Image.Resampling.LANCZOS)
fg.paste(l2, (80, (500-l2.height)//2), l2)
draw = ImageDraw.Draw(fg)
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 56)
    font_sm = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 28)
except Exception:
    font = ImageFont.load_default(); font_sm = font
draw.text((480, 170), "SEP EXPLORER", fill=(255,255,255,255), font=font)
draw.text((480, 250), "Explore. Discover. Integrate.", fill=GOLD, font=font_sm)
p = ROOT / "stores/playstore/assets/feature-graphic.png"; ensure(p); fg.save(p)

# App Store icon copy
p = ROOT / "stores/appstore/assets/icon-1024.png"; ensure(p)
Image.open(ROOT / "frontend/assets/images/icon.png").save(p)

# Screenshot placeholders (phone + tablet + ipad slots)
slots = [
  ("stores/playstore/assets/screenshots/phone-01-projects.png", 1080, 1920, "Projects"),
  ("stores/playstore/assets/screenshots/phone-02-catalog.png", 1080, 1920, "Catalog"),
  ("stores/playstore/assets/screenshots/phone-03-settings.png", 1080, 1920, "Settings"),
  ("stores/playstore/assets/screenshots/tablet-01-projects.png", 1600, 2560, "Projects"),
  ("stores/playstore/assets/screenshots/tablet-02-catalog.png", 1600, 2560, "Catalog"),
  ("stores/playstore/assets/screenshots/tablet-03-settings.png", 1600, 2560, "Settings"),
  ("stores/appstore/assets/screenshots/iphone-01-projects.png", 1290, 2796, "Projects"),
  ("stores/appstore/assets/screenshots/iphone-02-catalog.png", 1290, 2796, "Catalog"),
  ("stores/appstore/assets/screenshots/iphone-03-settings.png", 1290, 2796, "Settings"),
  ("stores/appstore/assets/screenshots/ipad-01-projects.png", 2048, 2732, "Projects"),
  ("stores/appstore/assets/screenshots/ipad-02-catalog.png", 2048, 2732, "Catalog"),
  ("stores/appstore/assets/screenshots/ipad-03-settings.png", 2048, 2732, "Settings"),
]
for rel, w, h, label in slots:
    canvas = Image.new("RGBA", (w, h), NAVY)
    mark = logo.copy(); mark.thumbnail((int(w*0.45), int(h*0.35)), Image.Resampling.LANCZOS)
    canvas.paste(mark, ((w-mark.width)//2, int(h*0.22)), mark)
    d = ImageDraw.Draw(canvas)
    d.text((w//2 - 80, int(h*0.62)), f"SEP Explorer — {label}", fill=(255,255,255,255), font=font_sm)
    d.text((w//2 - 120, int(h*0.68)), "REPLACE WITH DEVICE SCREENSHOT", fill=GOLD, font=font_sm)
    out = ROOT / rel; ensure(out); canvas.save(out)

print("store assets generated")
`
  const r = spawnSync("python3", ["-c", script], { encoding: "utf8" });
  if (r.status !== 0) {
    console.error(r.stderr || r.stdout);
    process.exit(r.status || 1);
  }
  console.log(r.stdout.trim());
}

withPillowFallback();
