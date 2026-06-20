import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ActivityIndicator,
  Switch,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import {
  api,
  currency,
  Equipment,
  Project,
  LaborRates,
  ROLE_LABELS,
} from "@/src/api";

export default function SaveToProjectScreen() {
  const { ids: idsParam } = useLocalSearchParams<{ ids?: string }>();
  const router = useRouter();

  const selectedIds = useMemo(
    () => (idsParam ? idsParam.split(",").filter(Boolean) : []),
    [idsParam]
  );

  const [projects, setProjects] = useState<Project[]>([]);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [rates, setRates] = useState<LaborRates | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSavingId] = useState<string | null>(null);
  const [useSellPrice, setUseSellPrice] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [hours, setHours] = useState<Record<string, number>>({});
  const [role, setRole] = useState<keyof LaborRates>("technician");
  const [rowRoles, setRowRoles] = useState<Record<string, keyof LaborRates>>({});
  const [done, setDone] = useState<{ project: string; count: number } | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      Promise.all([api.listProjects(), api.listEquipment(), api.getRates()])
        .then(([ps, eqs, rs]) => {
          setProjects(ps);
          setEquipment(eqs);
          setRates(rs);
          setQuantities((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
              if (next[id] == null) next[id] = 1;
            });
            return next;
          });
          setHours((prev) => {
            const next = { ...prev };
            selectedIds.forEach((id) => {
              if (next[id] == null) next[id] = 0;
            });
            return next;
          });
        })
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [selectedIds])
  );

  const selectedEquipment = useMemo(
    () => equipment.filter((e) => selectedIds.includes(e.id)),
    [equipment, selectedIds]
  );

  const qtyOf = (id: string) => quantities[id] ?? 1;
  const hoursOf = (id: string) => hours[id] ?? 0;
  const roleOf = (id: string) => rowRoles[id] ?? role;

  const priceOf = (eq: Equipment) =>
    useSellPrice && eq.sell_price ? eq.sell_price : eq.cost;

  const hourlyRate = rates ? rates[role] : 0;
  const rateOf = (id: string) => (rates ? rates[roleOf(id)] : 0);

  const ROLE_ORDER: (keyof LaborRates)[] = [
    "technician",
    "lead_technician",
    "engineer",
    "project_manager",
    "closeout",
  ];

  const cycleRowRole = (id: string) => {
    setRowRoles((prev) => {
      const cur = prev[id] ?? role;
      const idx = ROLE_ORDER.indexOf(cur);
      const next = ROLE_ORDER[(idx + 1) % ROLE_ORDER.length];
      return { ...prev, [id]: next };
    });
  };

  const ROLE_ABBREV: Record<keyof LaborRates, string> = {
    technician: "Tech",
    lead_technician: "Lead",
    engineer: "Engr",
    project_manager: "PM",
    closeout: "COx",
  };

  const materialCost = useMemo(
    () => selectedEquipment.reduce((s, eq) => s + priceOf(eq) * qtyOf(eq.id), 0),
    [selectedEquipment, useSellPrice, quantities]
  );

  const laborCost = useMemo(
    () => selectedEquipment.reduce((s, eq) => s + hoursOf(eq.id) * rateOf(eq.id), 0),
    [selectedEquipment, hours, rowRoles, role, rates]
  );

  const totalCost = materialCost + laborCost;

  const totalUnits = useMemo(
    () => selectedEquipment.reduce((s, eq) => s + qtyOf(eq.id), 0),
    [selectedEquipment, quantities]
  );

  const totalHours = useMemo(
    () => selectedEquipment.reduce((s, eq) => s + hoursOf(eq.id), 0),
    [selectedEquipment, hours]
  );

  const bumpQty = (id: string, delta: number) => {
    setQuantities((prev) => {
      const cur = prev[id] ?? 1;
      const nextVal = Math.max(1, Math.min(999, cur + delta));
      return { ...prev, [id]: nextVal };
    });
  };

  const bumpHours = (id: string, delta: number) => {
    setHours((prev) => {
      const cur = prev[id] ?? 0;
      const nextVal = Math.max(0, Math.min(99, Math.round((cur + delta) * 2) / 2));
      return { ...prev, [id]: nextVal };
    });
  };

  const onSave = async (project: Project) => {
    if (selectedEquipment.length === 0) return;
    setSavingId(project.id);
    try {
      const items = selectedEquipment.map((eq) => ({
        description: `${eq.manufacturer} ${eq.model}`,
        equipment_id: eq.id,
        quantity: qtyOf(eq.id),
        unit_cost: priceOf(eq),
        labor_hours: hoursOf(eq.id),
        labor_role: roleOf(eq.id),
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
          <Text style={styles.summaryValue}>{currency(totalCost)}</Text>
          <Text style={styles.summarySub}>
            {selectedEquipment.length} {selectedEquipment.length === 1 ? "product" : "products"}
            {" · "}{totalUnits} units{totalHours > 0 ? ` · ${totalHours}h labor` : ""}
          </Text>
          {laborCost > 0 && (
            <Text style={styles.summaryBreakdown}>
              {currency(materialCost)} mat + {currency(laborCost)} labor
            </Text>
          )}
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
            <>
              {selectedEquipment.length > 0 && (
                <View style={{ marginBottom: spacing.lg }} testID="qty-section">
                  <Text style={styles.section}>Crew Role · {currency(hourlyRate)}/hr (default)</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
                  >
                    {(Object.keys(ROLE_LABELS) as (keyof LaborRates)[]).map((r) => (
                      <Pressable
                        key={r}
                        testID={`role-${r}`}
                        onPress={() => setRole(r)}
                        style={[styles.rolePill, role === r && styles.rolePillActive]}
                      >
                        <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                          {ROLE_LABELS[r]}
                        </Text>
                      </Pressable>
                    ))}
                  </ScrollView>

                  <Text style={styles.section}>Quantities & Labor</Text>
                  {selectedEquipment.map((eq) => {
                    const qty = qtyOf(eq.id);
                    const hrs = hoursOf(eq.id);
                    const unitPrice = priceOf(eq);
                    const lineMat = unitPrice * qty;
                    const rowRole = roleOf(eq.id);
                    const rowRate = rateOf(eq.id);
                    const lineLabor = hrs * rowRate;
                    const overridden = rowRoles[eq.id] != null && rowRoles[eq.id] !== role;
                    return (
                      <View key={eq.id} style={styles.qtyRow} testID={`qty-row-${eq.id}`}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qtyTitle} numberOfLines={1}>
                            {eq.manufacturer} {eq.model}
                          </Text>
                          <Text style={styles.qtySub}>
                            {currency(lineMat)} mat
                            {lineLabor > 0 ? ` + ${currency(lineLabor)} labor` : ""}
                          </Text>
                          <Pressable
                            testID={`row-role-${eq.id}`}
                            onPress={() => cycleRowRole(eq.id)}
                            hitSlop={6}
                            style={[styles.roleBadge, overridden && styles.roleBadgeOverridden]}
                          >
                            <Ionicons
                              name="person-outline"
                              size={11}
                              color={overridden ? colors.brandPrimary : colors.muted}
                            />
                            <Text style={[styles.roleBadgeText, overridden && styles.roleBadgeTextOverridden]}>
                              {ROLE_ABBREV[rowRole]} · ${rowRate.toFixed(0)}/hr
                            </Text>
                          </Pressable>
                        </View>
                        <View style={styles.controlsCol}>
                          <View style={styles.controlGroup}>
                            <Text style={styles.controlLabel}>Qty</Text>
                            <View style={styles.stepper}>
                              <Pressable
                                testID={`qty-down-${eq.id}`}
                                onPress={() => bumpQty(eq.id, -1)}
                                disabled={qty <= 1}
                                hitSlop={6}
                                style={[styles.stepBtn, qty <= 1 && { opacity: 0.35 }]}
                              >
                                <Ionicons name="remove" size={14} color={colors.brandPrimary} />
                              </Pressable>
                              <Text style={styles.qtyText} testID={`qty-val-${eq.id}`}>{qty}</Text>
                              <Pressable
                                testID={`qty-up-${eq.id}`}
                                onPress={() => bumpQty(eq.id, 1)}
                                hitSlop={6}
                                style={styles.stepBtn}
                              >
                                <Ionicons name="add" size={14} color={colors.brandPrimary} />
                              </Pressable>
                            </View>
                          </View>
                          <View style={styles.controlGroup}>
                            <Text style={styles.controlLabel}>Hours</Text>
                            <View style={styles.stepper}>
                              <Pressable
                                testID={`hr-down-${eq.id}`}
                                onPress={() => bumpHours(eq.id, -0.5)}
                                disabled={hrs <= 0}
                                hitSlop={6}
                                style={[styles.stepBtn, hrs <= 0 && { opacity: 0.35 }]}
                              >
                                <Ionicons name="remove" size={14} color={colors.brandPrimary} />
                              </Pressable>
                              <Text style={styles.qtyText} testID={`hr-val-${eq.id}`}>
                                {hrs % 1 === 0 ? hrs : hrs.toFixed(1)}
                              </Text>
                              <Pressable
                                testID={`hr-up-${eq.id}`}
                                onPress={() => bumpHours(eq.id, 0.5)}
                                hitSlop={6}
                                style={styles.stepBtn}
                              >
                                <Ionicons name="add" size={14} color={colors.brandPrimary} />
                              </Pressable>
                            </View>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
              {projects.length > 0 ? <Text style={styles.section}>Choose project</Text> : null}
            </>
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
  qtyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  qtyTitle: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  qtySub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  controlsCol: { gap: 6 },
  controlGroup: { flexDirection: "row", alignItems: "center", gap: 6 },
  controlLabel: { fontSize: 10, color: colors.muted, fontWeight: "700", width: 32 },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    flexShrink: 0,
  },
  rolePillActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  roleText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
  roleTextActive: { color: colors.onBrandTertiary },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: colors.surface,
    borderRadius: radius.pill,
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  stepBtn: {
    width: 26, height: 26, borderRadius: 13,
    justifyContent: "center", alignItems: "center",
  },
  qtyText: {
    minWidth: 28,
    textAlign: "center",
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: fontSize.sm,
  },
  summaryBreakdown: { fontSize: 11, color: colors.brandPrimary, marginTop: 2, fontWeight: "600" },
  roleBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  roleBadgeOverridden: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  roleBadgeText: { fontSize: 10, fontWeight: "700", color: colors.muted },
  roleBadgeTextOverridden: { color: colors.brandPrimary },
});
