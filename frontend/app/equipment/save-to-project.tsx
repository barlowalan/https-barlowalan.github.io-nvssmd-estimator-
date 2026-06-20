import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, currency, Equipment, Project } from "@/src/api";

export default function SaveToProjectScreen() {
  const { ids: idsParam } = useLocalSearchParams<{ ids?: string }>();
  const router = useRouter();

  const selectedIds = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSavingId] = useState<string | null>(null);
  const [useSellPrice, setUseSellPrice] = useState(false);
  const [done, setDone] = useState<{ project: string; count: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([api.listProjects(), api.listEquipment()])
        .then(([ps, eqs]) => {
          setProjects(ps);
          setEquipment(eqs);
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [])
  );

  const selectedEquipment = useMemo(
    () => equipment.filter((e) => selectedIds.includes(e.id)),
    [equipment, selectedIds]
  );

  const totalCost = useMemo(
    () =>
      selectedEquipment.reduce(
        (s, eq) => s + (useSellPrice && eq.sell_price ? eq.sell_price : eq.cost),
        0
      ),
    [selectedEquipment, useSellPrice]
  );

  const onSave = async (project: Project) => {
    if (selectedEquipment.length === 0) return;
    setSavingId(project.id);
    try {
      const items = selectedEquipment.map((eq) => ({
        description: `${eq.manufacturer} ${eq.model}`,
        equipment_id: eq.id,
        quantity: 1,
        unit_cost: useSellPrice && eq.sell_price ? eq.sell_price : eq.cost,
        labor_hours: 0,
        labor_role: "technician" as const,
      }));
      await api.addItemsBulk(project.id, items);
      setDone({ project: project.name, count: items.length });
    } finally {
      setSavingId(null);
    }
  };

  if (done) {
    return (
      <SafeAreaView style={styles.safe} edges={["top"]}>
        <View style={styles.successWrap} testID="save-success">
          <View style={styles.successIcon}>
            <Ionicons name="checkmark" size={36} color={colors.onBrandPrimary} />
          </View>
          <Text style={styles.successTitle}>Added to {done.project}</Text>
          <Text style={styles.successSub}>
            {done.count} {done.count === 1 ? "product was" : "products were"} added as line items.
          </Text>
          <View style={{ flexDirection: "row", gap: spacing.sm, marginTop: spacing.xl }}>
            <Pressable
              testID="back-to-equipment"
              onPress={() => router.back()}
              style={[styles.successBtn, styles.successBtnGhost]}
            >
              <Text style={styles.successBtnGhostText}>Back to Library</Text>
            </Pressable>
            <Pressable
              testID="open-project"
              onPress={() => {
                const p = projects.find((pr) => pr.name === done.project);
                if (p) router.replace(`/project/${p.id}`);
                else router.back();
              }}
              style={[styles.successBtn, styles.successBtnPrimary]}
            >
              <Text style={styles.successBtnPrimaryText}>Open Project</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="close-save-to-project" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>Save to Project</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.summaryCard} testID="selection-summary">
        <View style={{ flex: 1 }}>
          <Text style={styles.summaryLabel}>SELECTED</Text>
          <Text style={styles.summaryValue}>
            {selectedEquipment.length} {selectedEquipment.length === 1 ? "product" : "products"}
          </Text>
          <Text style={styles.summarySub}>{currency(totalCost)} total · 1× each</Text>
        </View>
        <View style={styles.sellRow}>
          <Text style={styles.sellLabel}>Sell price</Text>
          <Switch
            testID="toggle-sell-price"
            value={useSellPrice}
            onValueChange={setUseSellPrice}
            trackColor={{ true: colors.brandPrimary, false: colors.border }}
          />
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 80 }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="no-projects">
              <View style={styles.emptyIcon}>
                <Ionicons name="folder-open-outline" size={32} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySub}>Create a project first, then come back to save these products into it.</Text>
              <Pressable
                testID="goto-new-project"
                onPress={() => router.replace("/project/new")}
                style={[styles.successBtn, styles.successBtnPrimary, { marginTop: spacing.lg }]}
              >
                <Text style={styles.successBtnPrimaryText}>Create Project</Text>
              </Pressable>
            </View>
          }
          ListHeaderComponent={
            projects.length > 0 ? <Text style={styles.section}>Choose project</Text> : null
          }
          renderItem={({ item }) => {
            const c = item.counts;
            const isSaving = saving === item.id;
            return (
              <Pressable
                testID={`save-to-${item.id}`}
                onPress={() => onSave(item)}
                disabled={!!saving}
                style={({ pressed }) => [
                  styles.projectRow,
                  pressed && { opacity: 0.85 },
                  saving && saving !== item.id && { opacity: 0.4 },
                ]}
              >
                <View style={styles.projectIcon}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.projectTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.projectSub} numberOfLines={1}>
                    {item.customer || "—"} · {c.cameras}c · {c.doors}d · {c.ids_points} IDS
                  </Text>
                </View>
                {isSaving ? (
                  <ActivityIndicator color={colors.brandPrimary} />
                ) : (
                  <Ionicons name="chevron-forward" size={20} color={colors.muted} />
                )}
              </Pressable>
            );
          }}
        />
      )}
    </SafeAreaView>
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
  summaryCard: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: spacing.md,
  },
  summaryLabel: { fontSize: 10, fontWeight: "700", color: colors.onBrandTertiary, letterSpacing: 1 },
  summaryValue: { fontSize: fontSize.xxl, fontWeight: "800", color: colors.brandPrimary, marginTop: 2 },
  summarySub: { fontSize: fontSize.sm, color: colors.onBrandTertiary, marginTop: 2 },
  sellRow: { alignItems: "center", gap: 6 },
  sellLabel: { fontSize: 11, color: colors.onBrandTertiary, fontWeight: "600" },
  section: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.md,
    marginTop: spacing.md,
  },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface },
  emptySub: {
    fontSize: fontSize.base,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  projectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  projectIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
  },
  projectTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.onSurface },
  projectSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  successWrap: { flex: 1, justifyContent: "center", alignItems: "center", padding: spacing.xl },
  successIcon: {
    width: 84, height: 84, borderRadius: 42,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  successTitle: { fontSize: fontSize.xxl, fontWeight: "700", color: colors.onSurface, textAlign: "center" },
  successSub: { fontSize: fontSize.base, color: colors.muted, marginTop: spacing.sm, textAlign: "center", paddingHorizontal: spacing.lg },
  successBtn: { paddingVertical: 12, paddingHorizontal: spacing.lg, borderRadius: radius.md },
  successBtnGhost: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  successBtnGhostText: { color: colors.onSurface, fontWeight: "700", fontSize: fontSize.base },
  successBtnPrimary: { backgroundColor: colors.brandPrimary },
  successBtnPrimaryText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.base },
});
