import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, currency, Equipment, CATEGORIES } from "@/src/api";
import {
  ExplorerPolicy,
  canCreateCatalogRecord,
  catalogLimitMessage,
} from "@/src/explorerPolicy";

export default function EquipmentScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Equipment[]>([]);
  const [catalogTotal, setCatalogTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const load = useCallback(async () => {
    try {
      const [list, all] = await Promise.all([
        api.listEquipment(category === "all" ? undefined : category),
        category === "all" ? Promise.resolve(null) : api.listEquipment(),
      ]);
      setItems(list);
      setCatalogTotal(all ? all.length : list.length);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [category]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      load();
    }, [load])
  );

  const onDelete = async (id: string) => {
    await api.deleteEquipment(id);
    load();
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const onSaveToProject = () => {
    if (selectedIds.size === 0) return;
    const ids = Array.from(selectedIds).join(",");
    router.push({ pathname: "/equipment/save-to-project", params: { ids } });
    // Clear after a small delay so coming back doesn't immediately resurface
    setTimeout(exitSelectMode, 400);
  };

  const summary = useMemo(() => {
    let total = 0;
    items.forEach((eq) => {
      if (selectedIds.has(eq.id)) total += eq.cost;
    });
    return { total, count: selectedIds.size };
  }, [selectedIds, items]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Equipment Catalog</Text>
          <Text style={styles.quota} testID="explorer-catalog-quota">
            {catalogTotal}/{ExplorerPolicy.catalogRecordLimit} catalog records
          </Text>
        </View>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          {selectMode ? (
            <Pressable
              testID="cancel-select"
              onPress={exitSelectMode}
              style={[styles.iconBtn, styles.iconBtnGhost]}
            >
              <Text style={styles.iconBtnGhostText}>Cancel</Text>
            </Pressable>
          ) : (
            <>
              <Pressable
                testID="enter-select-mode"
                onPress={() => setSelectMode(true)}
                style={[styles.iconBtn, styles.iconBtnGhost]}
              >
                <Ionicons name="checkmark-done-outline" size={18} color={colors.brandPrimary} />
              </Pressable>
              <Pressable
                testID="import-equipment-button"
                onPress={() => {
                  if (!canCreateCatalogRecord(catalogTotal)) {
                    Alert.alert("Catalog limit reached", catalogLimitMessage(catalogTotal));
                    return;
                  }
                  router.push("/equipment/import");
                }}
                style={[styles.iconBtn, styles.iconBtnGhost]}
              >
                <Ionicons name="cloud-upload-outline" size={18} color={colors.brandPrimary} />
              </Pressable>
              <Pressable
                testID="add-equipment-button"
                onPress={() => {
                  if (!canCreateCatalogRecord(catalogTotal)) {
                    Alert.alert("Catalog limit reached", catalogLimitMessage(catalogTotal));
                    return;
                  }
                  router.push("/equipment/new");
                }}
                style={[styles.iconBtn, styles.iconBtnPrimary]}
              >
                <Ionicons name="add" size={20} color={colors.onBrandPrimary} />
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={styles.chipsWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
        >
          <Chip label="All" active={category === "all"} onPress={() => setCategory("all")} testID="chip-all" />
          {CATEGORIES.map((c) => (
            <Chip
              key={c}
              label={c}
              active={category === c}
              onPress={() => setCategory(c)}
              testID={`chip-${c.replace(/[/\s]/g, "-").toLowerCase()}`}
            />
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(e) => e.id}
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: selectMode && selectedIds.size > 0 ? 200 : 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          ListEmptyComponent={
            <View style={styles.empty} testID="equipment-empty">
              <View style={styles.emptyIconWrap}>
                <Ionicons name="cube-outline" size={36} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No equipment yet</Text>
              <Text style={styles.emptySub}>Build your library of cameras, controllers, locks and cabling.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const isSelected = selectedIds.has(item.id);
            return (
              <Pressable
                testID={`equipment-row-${item.id}`}
                onPress={() => selectMode && toggleSelect(item.id)}
                style={[styles.row, selectMode && isSelected && styles.rowSelected]}
              >
                {selectMode ? (
                  <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                    {isSelected ? (
                      <Ionicons name="checkmark" size={14} color={colors.onBrandPrimary} />
                    ) : null}
                  </View>
                ) : (
                  <View style={styles.rowIcon}>
                    <Ionicons name="hardware-chip-outline" size={20} color={colors.brandPrimary} />
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.manufacturer} {item.model}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.category} · ${item.cost.toFixed(2)} cost
                    {item.sell_price ? ` · $${item.sell_price.toFixed(2)} sell` : ""} · {item.lead_time_days}d lead
                  </Text>
                  <View style={styles.tagsRow}>
                    {item.ndaa && (
                      <View style={[styles.tag, { backgroundColor: colors.brandSecondary }]}>
                        <Text style={[styles.tagText, { color: colors.onBrandSecondary }]}>NDAA</Text>
                      </View>
                    )}
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>{item.warranty_years}yr warranty</Text>
                    </View>
                  </View>
                </View>
                {!selectMode && (
                  <Pressable
                    onPress={() => onDelete(item.id)}
                    hitSlop={8}
                    testID={`delete-equipment-${item.id}`}
                  >
                    <Ionicons name="trash-outline" size={18} color={colors.error} />
                  </Pressable>
                )}
              </Pressable>
            );
          }}
        />
      )}

      {selectMode && selectedIds.size > 0 && (
        <View style={styles.footer} testID="select-footer">
          <View style={{ flex: 1 }}>
            <Text style={styles.footerSub}>
              {summary.count} {summary.count === 1 ? "item" : "items"} selected
            </Text>
            <Text style={styles.footerTotal}>{currency(summary.total)}</Text>
          </View>
          <Pressable
            testID="save-to-project-btn"
            onPress={onSaveToProject}
            style={({ pressed }) => [styles.cta, pressed && { opacity: 0.85 }]}
          >
            <Text style={styles.ctaText}>Save to project</Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onBrandPrimary} />
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID: string;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", color: colors.onSurface },
  quota: { fontSize: 12, color: colors.muted, marginTop: 2 },
  iconBtn: {
    height: 44,
    minWidth: 44,
    paddingHorizontal: spacing.sm,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  iconBtnGhost: { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border },
  iconBtnGhostText: { color: colors.brandPrimary, fontWeight: "700", fontSize: fontSize.sm, paddingHorizontal: 4 },
  iconBtnPrimary: { backgroundColor: colors.brandPrimary, width: 44 },
  chipsWrap: { height: 56, justifyContent: "center" },
  chip: {
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    flexShrink: 0,
  },
  chipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  chipText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
  chipTextActive: { color: colors.onBrandTertiary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface },
  emptySub: { fontSize: fontSize.base, color: colors.muted, marginTop: spacing.sm, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  rowSelected: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
  },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.surfaceSecondary,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandPrimary },
  rowTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: colors.onSurfaceTertiary },
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 84,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    padding: spacing.lg,
  },
  footerSub: { fontSize: fontSize.sm, color: colors.muted },
  footerTotal: { fontSize: fontSize.xl, fontWeight: "700", color: colors.brandPrimary, marginTop: 2 },
  cta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
