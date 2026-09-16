/**
 * @jest-environment node
 */
const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "../..");

describe("ExplorerPolicy parity", () => {
  const ts = fs.readFileSync(
    path.join(ROOT, "frontend/src/explorerPolicy.ts"),
    "utf8"
  );
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

  test("all platforms declare Explorer free tier", () => {
    for (const src of [ts, swift, kt]) {
      expect(src).toMatch(/Explorer/);
      expect(src).toMatch(/Free/);
    }
  });

  test("limits are 10 / 50 / 20", () => {
    expect(ts).toMatch(/activeProjectLimit:\s*10/);
    expect(ts).toMatch(/catalogRecordLimit:\s*50/);
    expect(ts).toMatch(/laborRecordLimit:\s*20/);
    expect(swift).toMatch(/activeProjectLimit = 10/);
    expect(kt).toMatch(/activeProjectLimit = 10/);
  });

  test("paid modules excluded", () => {
    expect(ts).toMatch(/includesDrawing:\s*false/);
    expect(swift).toMatch(/includesDrawing = false/);
    expect(kt).toMatch(/includesDrawing = false/);
  });
});

describe("Store packages", () => {
  test("App Store and Play Store listings exist", () => {
    const ios = JSON.parse(
      fs.readFileSync(path.join(ROOT, "stores/appstore/listing.json"), "utf8")
    );
    const play = JSON.parse(
      fs.readFileSync(path.join(ROOT, "stores/playstore/listing.json"), "utf8")
    );
    expect(ios.bundleId).toBe("com.nvssmd.sepexplorer");
    expect(play.packageName).toBe("com.nvssmd.sepexplorer");
    expect(ios.privacyPolicyUrl).toContain("privacy");
    expect(play.privacyPolicyUrl).toContain("privacy");
  });

  test("EAS has separate production profiles per store", () => {
    const eas = JSON.parse(
      fs.readFileSync(path.join(ROOT, "frontend/eas.json"), "utf8")
    );
    expect(eas.build["production-ios"].env.EXPO_PUBLIC_STORE_TARGET).toBe(
      "appstore"
    );
    expect(eas.build["production-android"].env.EXPO_PUBLIC_STORE_TARGET).toBe(
      "playstore"
    );
  });
});
