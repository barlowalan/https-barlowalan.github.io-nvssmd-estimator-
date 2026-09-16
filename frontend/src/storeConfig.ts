/**
 * Runtime store metadata (mirrors stores/shared/store-config.json).
 */
export const StoreConfig = {
  appName: "SEP Explorer",
  bundleIdIos: "com.nvssmd.sepexplorer",
  packageAndroid: "com.nvssmd.sepexplorer",
  version: "1.0.0",
  privacyPolicyUrl:
    process.env.EXPO_PUBLIC_PRIVACY_URL ||
    "https://nvssmd.com/sep-explorer/privacy",
  supportUrl:
    process.env.EXPO_PUBLIC_SUPPORT_URL ||
    "https://nvssmd.com/sep-explorer/support",
  termsUrl:
    process.env.EXPO_PUBLIC_TERMS_URL ||
    "https://nvssmd.com/sep-explorer/terms",
  marketingUrl: process.env.EXPO_PUBLIC_MARKETING_URL || "https://nvssmd.com",
  supportEmail: "support@nvssmd.com",
  storeTarget: process.env.EXPO_PUBLIC_STORE_TARGET || "none",
  variant: process.env.EXPO_PUBLIC_APP_VARIANT || "development",
} as const;
