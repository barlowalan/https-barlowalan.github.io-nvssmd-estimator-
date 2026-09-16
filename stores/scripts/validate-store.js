#!/usr/bin/env node
/**
 * Validate store-readiness artifacts exist and policy parity holds.
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");
let failed = 0;

function ok(msg) {
  console.log("✓", msg);
}
function fail(msg) {
  console.error("✗", msg);
  failed += 1;
}
function mustExist(rel) {
  const p = path.join(ROOT, rel);
  if (fs.existsSync(p)) ok(rel);
  else fail(`missing ${rel}`);
}

const required = [
  "frontend/eas.json",
  "frontend/app.json",
  "frontend/src/explorerPolicy.ts",
  "frontend/src/storeConfig.ts",
  "stores/shared/store-config.json",
  "stores/legal/privacy-policy.html",
  "stores/legal/support.html",
  "stores/legal/terms.html",
  "stores/appstore/listing.json",
  "stores/appstore/PrivacyInfo.xcprivacy",
  "stores/appstore/checklist.md",
  "stores/playstore/listing.json",
  "stores/playstore/data-safety.json",
  "stores/playstore/checklist.md",
  "ios/SEPExplorer/SEPExplorerApp.swift",
  "android/SEPExplorer/app/src/main/java/com/nvssmd/sepexplorer/ExplorerPolicy.kt",
  "frontend/assets/images/icon.png",
  "frontend/assets/images/sep-logo.png",
];

required.forEach(mustExist);

// Policy parity
const ts = fs.readFileSync(path.join(ROOT, "frontend/src/explorerPolicy.ts"), "utf8");
const swift = fs.readFileSync(
  path.join(ROOT, "ios/SEPExplorer/Policy/ExplorerPolicy.swift"),
  "utf8"
);
const kt = fs.readFileSync(
  path.join(
    ROOT,
    "android/SEPExplorer/app/src/main/java/com/nvssmd/sepexplorer/ExplorerPolicy.kt"
  ),
  "utf8"
);
const appJson = JSON.parse(fs.readFileSync(path.join(ROOT, "frontend/app.json"), "utf8"));
const eas = JSON.parse(fs.readFileSync(path.join(ROOT, "frontend/eas.json"), "utf8"));

for (const [label, src] of [
  ["ts", ts],
  ["swift", swift],
  ["kotlin", kt],
]) {
  if (!src.includes("10") || !src.includes("50") || !src.includes("20")) {
    fail(`${label} ExplorerPolicy limits missing`);
  } else ok(`${label} ExplorerPolicy limits present`);
}

if (appJson.expo.ios.bundleIdentifier !== "com.nvssmd.sepexplorer") {
  fail("iOS bundleIdentifier mismatch");
} else ok("iOS bundleIdentifier");

if (appJson.expo.android.package !== "com.nvssmd.sepexplorer") {
  fail("Android package mismatch");
} else ok("Android package");

if (appJson.expo.ios.infoPlist.ITSAppUsesNonExemptEncryption !== false) {
  fail("ITSAppUsesNonExemptEncryption must be false");
} else ok("export compliance flag");

if (!eas.build["production-ios"] || !eas.build["production-android"]) {
  fail("eas production-ios / production-android profiles missing");
} else ok("EAS store profiles");

if (String(appJson.expo.extra?.eas?.projectId || "").includes("REPLACE")) {
  console.warn("! EAS projectId still placeholder — set before store submit");
} else ok("EAS projectId configured");

const strict = process.env.STORE_STRICT === "1";
if (strict && String(appJson.expo.extra?.eas?.projectId || "").includes("REPLACE")) {
  fail("EAS projectId required under STORE_STRICT=1");
}

if (failed) {
  console.error(`\nStore validation failed: ${failed} issue(s)`);
  process.exit(1);
}
console.log("\nStore validation passed for local testing.");
console.log("Set STORE_STRICT=1 after filling EAS/ASC/Play credentials for submit gate.");
