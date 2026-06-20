import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import {
  api,
  currency,
  Project,
  EstimateItem,
  EstimateSummary,
  ROLE_LABELS,
} from "@/src/api";

export default function ProjectDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [items, setItems] = useState<EstimateItem[]>([]);
  const [estimate, setEstimate] = useState<EstimateSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, its, est] = await Promise.all([
        api.getProject(id),
        api.listItems(id),
        api.estimate(id),
      ]);
      setProject(p);
      setItems(its);
      setEstimate(est);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onDeleteItem = async (itemId: string) => {
    if (!id) return;
    await api.deleteItem(id, itemId);
    load();
  };

  const onDeleteProject = async () => {
    if (!id) return;
    await api.deleteProject(id);
    router.replace("/");
  };

  if (loading || !project || !estimate) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-btn" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{project.name}</Text>
        <Pressable testID="delete-project" onPress={onDeleteProject} hitSlop={10}>
          <Ionicons name="trash-outline" size={22} color={colors.error} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />
        }
      >
        <View style={styles.summaryCard} testID="estimate-summary">
          <Text style={styles.summaryLabel}>ESTIMATED SELL PRICE</Text>
          <Text style={styles.summaryTotal}>{currency(estimate.total)}</Text>
          <View style={styles.summaryGrid}>
            <SumLine label="Material" value={estimate.material_cost} />
            <SumLine label="Labor" value={estimate.labor_cost} />
            <SumLine label="Subtotal" value={estimate.subtotal} bold />
            <SumLine label={`OH ${project.overhead_pct}%`} value={estimate.overhead} />
            <SumLine label={`Profit ${project.profit_pct}%`} value={estimate.profit} />
            <SumLine label={`Contingency ${project.contingency_pct}%`} value={estimate.contingency} />
          </View>
        </View>

        <View style={styles.metaRow}>
          <Meta label="Customer" value={project.customer || "—"} />
          <Meta label="Site" value={project.site || "—"} />
          <Meta label="Type" value={project.project_type} />
        </View>

        <Text style={styles.section}>System Counts</Text>
        <View style={styles.countsRow}>
          <Stat icon="videocam-outline" label="Cameras" value={project.counts.cameras} />
          <Stat icon="key-outline" label="Doors" value={project.counts.doors} />
          <Stat icon="radio-outline" label="IDS" value={project.counts.ids_points} />
          <Stat icon="call-outline" label="Intercoms" value={project.counts.intercoms} />
          <Stat icon="git-branch-outline" label="Cabling" value={project.counts.cable_runs} />
        </View>

        <View style={styles.sectionRow}>
          <Text style={styles.section}>Line Items ({items.length})</Text>
          <Pressable
            testID="add-item-btn"
            onPress={() => router.push({ pathname: "/project/[id]/add-item", params: { id: project.id } })}
            style={styles.addItemBtn}
          >
            <Ionicons name="add" size={16} color={colors.brandPrimary} />
            <Text style={styles.addItemText}>Add</Text>
          </Pressable>
        </View>

        {items.length === 0 ? (
          <View style={styles.emptyItems} testID="items-empty">
            <Ionicons name="list-outline" size={28} color={colors.muted} />
            <Text style={styles.emptyItemsText}>
              No line items yet. Add devices, labor and materials to build the estimate.
            </Text>
          </View>
        ) : (
          items.map((it) => (
            <View key={it.id} style={styles.itemRow} testID={`item-${it.id}`}>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle} numberOfLines={1}>{it.description}</Text>
                <Text style={styles.itemSub}>
                  {it.quantity} × {currency(it.unit_cost)} · {it.labor_hours}h {ROLE_LABELS[it.labor_role]}
                </Text>
              </View>
              <View style={{ alignItems: "flex-end" }}>
                <Text style={styles.itemPrice}>{currency(it.quantity * it.unit_cost)}</Text>
                <Pressable onPress={() => onDeleteItem(it.id)} hitSlop={8} testID={`delete-item-${it.id}`}>
                  <Ionicons name="trash-outline" size={16} color={colors.error} />
                </Pressable>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SumLine({ label, value, bold }: { label: string; value: number; bold?: boolean }) {
  return (
    <View style={styles.sumLine}>
      <Text style={[styles.sumLabel, bold && { fontWeight: "700", color: colors.onSurface }]}>{label}</Text>
      <Text style={[styles.sumValue, bold && { fontWeight: "700" }]}>{currency(value)}</Text>
    </View>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaBox}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue} numberOfLines={1}>{value}</Text>
    </View>
  );
}

function Stat({ icon, label, value }: { icon: any; label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Ionicons name={icon} size={18} color={colors.brandPrimary} />
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  headerTitle: { flex: 1, fontSize: fontSize.lg, fontWeight: "700", textAlign: "center", marginHorizontal: spacing.md, color: colors.onSurface },
  summaryCard: {
    backgroundColor: colors.surfaceInverse,
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  summaryLabel: { fontSize: fontSize.sm, color: colors.brandSecondary, fontWeight: "600", letterSpacing: 1 },
  summaryTotal: { fontSize: 36, fontWeight: "800", color: colors.onSurfaceInverse, marginTop: 4 },
  summaryGrid: { marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: "#444" },
  sumLine: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  sumLabel: { fontSize: fontSize.base, color: colors.brandSecondary },
  sumValue: { fontSize: fontSize.base, color: colors.onSurfaceInverse, fontWeight: "600" },
  metaRow: { flexDirection: "row", marginTop: spacing.lg, gap: spacing.sm },
  metaBox: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  metaLabel: { fontSize: 11, color: colors.muted, textTransform: "uppercase", letterSpacing: 0.5 },
  metaValue: { fontSize: fontSize.base, color: colors.onSurface, fontWeight: "600", marginTop: 4 },
  section: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addItemBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    gap: 4,
  },
  addItemText: { color: colors.brandPrimary, fontWeight: "700", fontSize: fontSize.sm },
  countsRow: { flexDirection: "row", gap: spacing.sm },
  statCard: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
  },
  statValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface, marginTop: 4 },
  statLabel: { fontSize: 10, color: colors.muted, marginTop: 2 },
  emptyItems: {
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  emptyItemsText: { color: colors.muted, textAlign: "center", marginTop: spacing.sm, fontSize: fontSize.sm },
  itemRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.md,
  },
  itemTitle: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  itemSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 4 },
  itemPrice: { fontSize: fontSize.base, fontWeight: "700", color: colors.brandPrimary, marginBottom: 8 },
});
