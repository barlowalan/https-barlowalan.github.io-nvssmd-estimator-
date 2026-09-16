import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, LaborRates, ROLE_LABELS } from "@/src/api";
import { ExplorerPolicy } from "@/src/explorerPolicy";

export default function SettingsScreen() {
  const [rates, setRates] = useState<LaborRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      (async () => {
        try {
          const r = await api.getRates();
          if (active) setRates(r);
        } catch (e) {
          console.warn(e);
        } finally {
          if (active) setLoading(false);
        }
      })();
      return () => {
        active = false;
      };
    }, [])
  );

  const update = (key: keyof LaborRates, value: string) => {
    if (!rates) return;
    const n = parseFloat(value || "0");
    setRates({ ...rates, [key]: isNaN(n) ? 0 : n });
    setSaved(false);
  };

  const onSave = async () => {
    if (!rates) return;
    setSaving(true);
    try {
      const r = await api.updateRates(rates);
      setRates(r);
      setSaved(true);
      setTimeout(() => setSaved(false), 1800);
    } finally {
      setSaving(false);
    }
  };

  const laborCount = rates ? Object.keys(rates).length : 0;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.brand}>SEP EXPLORER</Text>
        <Text style={styles.title}>Settings</Text>
        <Text style={styles.sub}>
          {ExplorerPolicy.tier} · {ExplorerPolicy.price} — labor rates power every estimate
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          <View style={styles.tierCard} testID="explorer-tier-card">
            <Text style={styles.tierTitle}>Explorer free-tier limits</Text>
            <Text style={styles.tierLine}>Active projects · {ExplorerPolicy.activeProjectLimit}</Text>
            <Text style={styles.tierLine}>Catalog records · {ExplorerPolicy.catalogRecordLimit}</Text>
            <Text style={styles.tierLine}>
              Labor records · {laborCount}/{ExplorerPolicy.laborRecordLimit}
            </Text>
            <View style={styles.excludedRow}>
              <Ionicons name="close-circle-outline" size={16} color={colors.muted} />
              <Text style={styles.excludedText}>
                Drawing, project management, and finance are not included in Explorer
              </Text>
            </View>
          </View>

          <Text style={styles.section}>Hourly Labor Rates (USD)</Text>
          {loading || !rates ? (
            <ActivityIndicator color={colors.brandPrimary} style={{ marginTop: spacing.xl }} />
          ) : (
            <View style={styles.card}>
              {(Object.keys(ROLE_LABELS) as (keyof LaborRates)[]).map((k, idx, arr) => (
                <View
                  key={k}
                  style={[styles.rateRow, idx !== arr.length - 1 && styles.rateRowDivider]}
                >
                  <Text style={styles.roleLabel}>{ROLE_LABELS[k]}</Text>
                  <View style={styles.rateInputWrap}>
                    <Text style={styles.dollar}>$</Text>
                    <TextInput
                      testID={`rate-${k}`}
                      style={styles.rateInput}
                      keyboardType="decimal-pad"
                      value={String(rates[k])}
                      onChangeText={(v) => update(k, v)}
                    />
                    <Text style={styles.perHour}>/hr</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          <View style={styles.aboutCard}>
            <Ionicons name="information-circle-outline" size={20} color={colors.brandPrimary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.aboutTitle}>How rates apply</Text>
              <Text style={styles.aboutBody}>
                When you add an estimate line item, the labor hours are multiplied by the role rate set here.
                Update these once and every project recalculates instantly.
              </Text>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          testID="save-rates-button"
          onPress={onSave}
          disabled={saving || loading}
          style={({ pressed }) => [
            styles.saveBtn,
            (pressed || saving) && { opacity: 0.85 },
            saved && { backgroundColor: colors.success },
          ]}
        >
          {saving ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.saveText}>{saved ? "Saved" : "Save Rates"}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.md },
  brand: {
    fontSize: fontSize.sm,
    color: colors.brandPrimary,
    fontWeight: "700",
    letterSpacing: 2,
  },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface, marginTop: 2 },
  sub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  tierCard: {
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  tierTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.onBrandTertiary, marginBottom: spacing.sm },
  tierLine: { fontSize: fontSize.sm, color: colors.onBrandTertiary, marginTop: 2 },
  excludedRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, alignItems: "flex-start" },
  excludedText: { flex: 1, fontSize: fontSize.sm, color: colors.muted, lineHeight: 18 },
  section: { fontSize: fontSize.sm, fontWeight: "700", color: colors.muted, textTransform: "uppercase", letterSpacing: 1, marginBottom: spacing.md },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  rateRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  rateRowDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  roleLabel: { fontSize: fontSize.lg, color: colors.onSurface, flex: 1 },
  rateInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    minWidth: 130,
  },
  dollar: { fontSize: fontSize.lg, color: colors.muted, marginRight: 2 },
  rateInput: { flex: 1, paddingVertical: 10, fontSize: fontSize.lg, color: colors.onSurface, fontWeight: "600" },
  perHour: { fontSize: fontSize.sm, color: colors.muted, marginLeft: 2 },
  aboutCard: {
    marginTop: spacing.xl,
    flexDirection: "row",
    gap: spacing.md,
    backgroundColor: colors.brandTertiary,
    padding: spacing.lg,
    borderRadius: radius.md,
  },
  aboutTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.onBrandTertiary },
  aboutBody: { fontSize: fontSize.sm, color: colors.onBrandTertiary, marginTop: 4, lineHeight: 18 },
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 84,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
