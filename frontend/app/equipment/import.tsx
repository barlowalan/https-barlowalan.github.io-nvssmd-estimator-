import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as DocumentPicker from "expo-document-picker";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api } from "@/src/api";

type Result = {
  filename: string;
  created: number;
  skipped: number;
  errors: string[];
};

export default function ImportEquipment() {
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);
  const [busy, setBusy] = useState(false);
  const [busyFile, setBusyFile] = useState<string | null>(null);

  const onPick = async () => {
    setBusy(true);
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ["text/csv", "text/comma-separated-values", "application/csv", "*/*"],
        multiple: true,
        copyToCacheDirectory: true,
      });
      if (res.canceled) return;
      const assets = res.assets || [];
      for (const a of assets) {
        const name = a.name || "upload.csv";
        setBusyFile(name);
        try {
          let text = "";
          if (Platform.OS === "web" && (a as any).file) {
            text = await (a as any).file.text();
          } else if (a.uri) {
            const r = await fetch(a.uri);
            text = await r.text();
          }
          if (!text) {
            setResults((prev) => [
              ...prev,
              { filename: name, created: 0, skipped: 0, errors: ["Could not read file"] },
            ]);
            continue;
          }
          const out = await api.importEquipment(text, name);
          setResults((prev) => [...prev, out]);
        } catch (e: any) {
          setResults((prev) => [
            ...prev,
            { filename: name, created: 0, skipped: 0, errors: [String(e?.message || e)] },
          ]);
        }
      }
    } finally {
      setBusy(false);
      setBusyFile(null);
    }
  };

  const totalCreated = results.reduce((s, r) => s + r.created, 0);
  const totalSkipped = results.reduce((s, r) => s + r.skipped, 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="close-import" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Import Equipment</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
        <View style={styles.hero}>
          <View style={styles.heroIcon}>
            <Ionicons name="cloud-upload-outline" size={28} color={colors.brandPrimary} />
          </View>
          <Text style={styles.heroTitle}>Bring your price book</Text>
          <Text style={styles.heroBody}>
            Pick one or many CSV files. We auto-map columns like Manufacturer, Part Number, System, MSRP, Dealer Cost, and Sell Price.
          </Text>
        </View>

        <View style={styles.specCard}>
          <Text style={styles.specHeader}>Recognized column names</Text>
          <SpecRow label="Manufacturer" hints="Manufacturer / Brand / Vendor" />
          <SpecRow label="Model" hints="Part Number, Description, Model, SKU" />
          <SpecRow label="Category" hints="System / Category / Type" />
          <SpecRow label="Cost" hints="Dealer Cost / Net Cost / Cost" />
          <SpecRow label="MSRP" hints="MSRP / List Price / Price" />
          <SpecRow label="Sell Price" hints="Proposal Sell Price / Sell" />
          <SpecRow label="NDAA" hints="NDAA Compliant (Yes/No)" last />
        </View>

        {results.length > 0 && (
          <>
            <View style={styles.summaryRow}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{totalCreated}</Text>
                <Text style={styles.summaryLabel}>Imported</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={[styles.summaryValue, { color: colors.warning }]}>{totalSkipped}</Text>
                <Text style={styles.summaryLabel}>Skipped</Text>
              </View>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryValue}>{results.length}</Text>
                <Text style={styles.summaryLabel}>Files</Text>
              </View>
            </View>

            {results.map((r, idx) => (
              <View key={`${r.filename}-${idx}`} style={styles.fileRow} testID={`result-${idx}`}>
                <Ionicons
                  name={r.created > 0 ? "checkmark-circle" : "alert-circle"}
                  size={20}
                  color={r.created > 0 ? colors.success : colors.warning}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.fileName} numberOfLines={1}>{r.filename}</Text>
                  <Text style={styles.fileMeta}>
                    +{r.created} added · {r.skipped} skipped
                  </Text>
                  {r.errors.slice(0, 2).map((e, i) => (
                    <Text key={i} style={styles.errorText}>· {e}</Text>
                  ))}
                  {r.errors.length > 2 && (
                    <Text style={styles.errorText}>+{r.errors.length - 2} more</Text>
                  )}
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {busy && busyFile && (
          <Text style={styles.busyText} testID="import-busy-text">Importing {busyFile}…</Text>
        )}
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable
            testID="pick-csv-button"
            onPress={onPick}
            disabled={busy}
            style={({ pressed }) => [
              styles.cta,
              busy && { opacity: 0.6 },
              pressed && { opacity: 0.85 },
            ]}
          >
            {busy ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <>
                <Ionicons name="document-attach-outline" size={18} color={colors.onBrandPrimary} />
                <Text style={styles.ctaText}>
                  {results.length > 0 ? "Pick more files" : "Pick CSV files"}
                </Text>
              </>
            )}
          </Pressable>
          {results.length > 0 && !busy && (
            <Pressable
              testID="done-import"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.doneBtn, pressed && { opacity: 0.85 }]}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}

function SpecRow({ label, hints, last }: { label: string; hints: string; last?: boolean }) {
  return (
    <View style={[styles.specRow, !last && styles.specRowDivider]}>
      <Text style={styles.specLabel}>{label}</Text>
      <Text style={styles.specHint} numberOfLines={1}>{hints}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  hero: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  heroIcon: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center", alignItems: "center",
  },
  heroTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onBrandTertiary },
  heroBody: { fontSize: fontSize.base, color: colors.onBrandTertiary, lineHeight: 20 },
  specCard: {
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  specHeader: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    padding: spacing.md,
    backgroundColor: colors.surfaceTertiary,
  },
  specRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    paddingHorizontal: spacing.md,
  },
  specRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  specLabel: { fontSize: fontSize.base, color: colors.onSurface, fontWeight: "600" },
  specHint: { fontSize: fontSize.sm, color: colors.muted, marginLeft: spacing.md, flexShrink: 1 },
  summaryRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  summaryBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    alignItems: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  summaryValue: { fontSize: fontSize.xxl, fontWeight: "800", color: colors.brandPrimary },
  summaryLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  fileRow: {
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.sm,
  },
  fileName: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  fileMeta: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  errorText: { fontSize: 11, color: colors.error, marginTop: 2 },
  footer: {
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  busyText: { fontSize: fontSize.sm, color: colors.muted, textAlign: "center", marginBottom: spacing.sm },
  cta: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
  doneBtn: {
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  doneText: { color: colors.onSurface, fontWeight: "700", fontSize: fontSize.lg },
});
