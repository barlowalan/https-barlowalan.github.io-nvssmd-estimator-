#!/usr/bin/env node
/**
 * Snapshot store-ready code into stores/appstore/code and stores/playstore/code.
 * Run from repo root: node stores/scripts/sync-store-code.js
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

function rmrf(p) {
  fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(from, to);
    else fs.copyFileSync(from, to);
  }
}

function writeManifest(storeDir, platform, sources) {
  const manifest = {
    platform,
    syncedAt: new Date().toISOString(),
    version: require(path.join(ROOT, "stores/shared/store-config.json")).version,
    sources,
  };
  fs.writeFileSync(path.join(storeDir, "MANIFEST.json"), JSON.stringify(manifest, null, 2));
}

// App Store package: SwiftUI + shared policy + Expo iOS config slice
const iosCode = path.join(ROOT, "stores/appstore/code");
rmrf(iosCode);
fs.mkdirSync(iosCode, { recursive: true });
copyDir(path.join(ROOT, "ios/SEPExplorer"), path.join(iosCode, "SEPExplorer"));
fs.copyFileSync(
  path.join(ROOT, "frontend/src/explorerPolicy.ts"),
  path.join(iosCode, "explorerPolicy.ts")
);
fs.copyFileSync(
  path.join(ROOT, "frontend/eas.json"),
  path.join(iosCode, "eas.json")
);
fs.copyFileSync(
  path.join(ROOT, "stores/appstore/PrivacyInfo.xcprivacy"),
  path.join(iosCode, "PrivacyInfo.xcprivacy")
);
fs.copyFileSync(
  path.join(ROOT, "stores/appstore/listing.json"),
  path.join(iosCode, "listing.json")
);
writeManifest(iosCode, "appstore", [
  "ios/SEPExplorer/**",
  "frontend/src/explorerPolicy.ts",
  "frontend/eas.json",
  "stores/appstore/PrivacyInfo.xcprivacy",
]);

// Play Store package: Compose + policy + EAS android profile
const playCode = path.join(ROOT, "stores/playstore/code");
rmrf(playCode);
fs.mkdirSync(playCode, { recursive: true });
copyDir(path.join(ROOT, "android/SEPExplorer"), path.join(playCode, "SEPExplorer"));
fs.copyFileSync(
  path.join(ROOT, "frontend/src/explorerPolicy.ts"),
  path.join(playCode, "explorerPolicy.ts")
);
fs.copyFileSync(
  path.join(ROOT, "frontend/eas.json"),
  path.join(playCode, "eas.json")
);
fs.copyFileSync(
  path.join(ROOT, "stores/playstore/listing.json"),
  path.join(playCode, "listing.json")
);
fs.copyFileSync(
  path.join(ROOT, "stores/playstore/data-safety.json"),
  path.join(playCode, "data-safety.json")
);
writeManifest(playCode, "playstore", [
  "android/SEPExplorer/**",
  "frontend/src/explorerPolicy.ts",
  "frontend/eas.json",
  "stores/playstore/data-safety.json",
]);

console.log("Synced store code packages:");
console.log(" -", iosCode);
console.log(" -", playCode);
