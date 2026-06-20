import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  FlatList,
  TextInput,
  ActivityIndicator,
  Switch,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, currency, Equipment, CATEGORIES } from "@/src/api";

type Selection = { qty: number };

export default function PickProductsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [useSellPrice, setUseSellPrice] = useState(false);
  const [selected, setSelected] = useState<Record<string, Selection>>({});
  const [adding, setAdding] = useState(false);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api.listEquipment().then((rows) => {
        setEquipment(rows);
        setLoading(false);
      }).catch(() => setLoading(false));
    }, [])
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return equipment.filter((eq) => {
      if (category !== "all" && eq.category !== category) return false;
      if (!q) return true;
      return (
        eq.manufacturer.toLowerCase().includes(q) ||
        eq.model.toLowerCase().includes(q) ||
        (eq.part_number || "").toLowerCase().includes(q)
      );
    });
  }, [equipment, category, search]);

  const priceOf = (eq: Equipment) =>
    useSellPrice && eq.sell_price ? eq.sell_price : eq.cost;

  const summary = useMemo(() => {
    let total = 0;
    let count = 0;
    let lines = 0;
    Object.entries(selected).forEach(([eqId, sel]) => {
      const eq = equipment.find((e) => e.id === eqId);
      if (!eq) return;
      total += priceOf(eq) * sel.qty;
      count += sel.qty;
      lines += 1;
    });
    return { total, count, lines };
  }, [selected, equipment, useSellPrice]);

  const toggle = (eq: Equipment) => {
    setSelected((prev) => {
      if (prev[eq.id]) {
        const { [eq.id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [eq.id]: { qty: 1 } };
    });
  };

  const bumpQty = (eqId: string, delta: number) => {
    setSelected((prev) => {
      const cur = prev[eqId];
      if (!cur) return prev;
      const nextQty = Math.max(1, cur.qty + delta);
      return { ...prev, [eqId]: { qty: nextQty } };
    });
  };

  const onAdd = async () => {
    if (!id || summary.lines === 0) return;
    setAdding(true);
    try {
      const items = Object.entries(selected)
        .map(([eqId, sel]) => {
          const eq = equipment.find((e) => e.id === eqId);
          if (!eq) return null;
          return {
            description: `${eq.manufacturer} ${eq.model}`,
            equipment_id: eq.id,
            quantity: sel.qty,
            unit_cost: priceOf(eq),
            labor_hours: 0,
            labor_role: "technician" as const,
          };
        })
        .filter(Boolean) as any[];
      await api.addItemsBulk(id, items);
      router.back();
    } finally {
      setAdding(false);
    }
  };

  const headerLeft = () => (
    <Pressable testID="pick-back" onPress={() => router.back()} hitSlop={10}>
      <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        {headerLeft()}
        <Text style={styles.title}>Pick Products</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            testID="search-products"
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search manufacturer, model or part #"
            placeholderTextColor={colors.muted}
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch("")} hitSlop={10}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.chipsRow}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: spacing.lg, gap: spacing.sm }}
          >
            <Chip label="All" active={category === "all"} onPress={() => setCategory("all")} testID="cat-all" />
            {CATEGORIES.map((c) => (
              <Chip
                key={c}
                label={c}
                active={category === c}
                onPress={() => setCategory(c)}
                testID={`cat-${c.replace(/[/\s]/g, "-").toLowerCase()}`}
              />
            ))}
          </ScrollView>
        </View>

        <View style={styles.sellRow}>
          <Text style={styles.sellLabel}>Use Sell Price</Text>
          <Switch
            testID="toggle-sell-price"
            value={useSellPrice}
            onValueChange={setUseSellPrice}
            trackColor={{ true: colors.brandPrimary, false: colors.border }}
          />
        </View>

        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.brandPrimary} />
          </View>
        ) : (
          <FlatList
            data={filtered}
            keyExtractor={(eq) => eq.id}
            contentContainerStyle={{
              padding: spacing.lg,
              paddingBottom: summary.lines > 0 ? 200 : 120,
            }}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            ListEmptyComponent={
              <View style={styles.empty} testID="pick-empty">
                <View style={styles.emptyIcon}>
                  <Ionicons name="search-outline" size={32} color={colors.brandPrimary} />
                </View>
                <Text style={styles.emptyTitle}>
                  {equipment.length === 0 ? "No equipment yet" : "No matches"}
                </Text>
                <Text style={styles.emptySub}>
                  {equipment.length === 0
                    ? "Import a CSV/XLSX from the Equipment tab or add items manually."
                    : "Try a different category or clear the search."}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const sel = selected[item.id];
              const price = priceOf(item);
              return (
                <Pressable
                  testID={`product-row-${item.id}`}
                  onPress={() => toggle(item)}
                  style={[styles.row, sel && styles.rowActive]}
                >
                  <View style={[styles.checkbox, sel && styles.checkboxActive]}>
                    {sel ? (
                      <Ionicons name="checkmark" size={16} color={colors.onBrandPrimary} />
                    ) : null}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rowTitle} numberOfLines={1}>
                      {item.manufacturer} {item.model}
                    </Text>
                    <Text style={styles.rowSub} numberOfLines={1}>
                      {item.category} · {currency(price)} {useSellPrice && item.sell_price ? "sell" : "cost"}
                    </Text>
                  </View>
                  {sel ? (
                    <View style={styles.stepper}>
                      <Pressable
                        testID={`qty-down-${item.id}`}
                        onPress={(e) => {
                          e.stopPropagation();
                          bumpQty(item.id, -1);
                        }}
                        hitSlop={6}
                        style={styles.stepBtn}
                      >
                        <Ionicons name="remove" size={16} color={colors.brandPrimary} />
                      </Pressable>
                      <Text style={styles.qtyText} testID={`qty-${item.id}`}>{sel.qty}</Text>
                      <Pressable
                        testID={`qty-up-${item.id}`}
                        onPress={(e) => {
                          e.stopPropagation();
                          bumpQty(item.id, 1);
                        }}
                        hitSlop={6}
                        style={styles.stepBtn}
                      >
                        <Ionicons name="add" size={16} color={colors.brandPrimary} />
                      </Pressable>
                    </View>
                  ) : (
                    <Ionicons name="add-circle-outline" size={22} color={colors.muted} />
                  )}
                </Pressable>
              );
            }}
          />
        )}
      </KeyboardAvoidingView>

      {summary.lines > 0 && (
        <View style={styles.footer} testID="pick-footer">
          <View style={{ flex: 1 }}>
            <Text style={styles.footerSub}>
              {summary.lines} {summary.lines === 1 ? "product" : "products"} · {summary.count} units
            </Text>
            <Text style={styles.footerTotal}>{currency(summary.total)}</Text>
          </View>
          <Pressable
            testID="add-selected"
            onPress={onAdd}
            disabled={adding}
            style={({ pressed }) => [
              styles.addBtn,
              (pressed || adding) && { opacity: 0.85 },
            ]}
          >
            {adding ? (
              <ActivityIndicator color={colors.onBrandPrimary} />
            ) : (
              <Text style={styles.addText}>Add to project</Text>
            )}
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Chip({
  label, active, onPress, testID,
}: { label: string; active: boolean; onPress: () => void; testID: string }) {
  return (
    <Pressable testID={testID} onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </Pressable>
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
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    marginTop: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  searchInput: { flex: 1, fontSize: fontSize.base, color: colors.onSurface, padding: 0 },
  chipsRow: { height: 56, justifyContent: "center" },
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
  sellRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: spacing.lg,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    marginBottom: spacing.sm,
  },
  sellLabel: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", padding: spacing.xl },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface },
  emptySub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 6, textAlign: "center" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  rowTitle: { fontSize: fontSize.base, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  checkbox: {
    width: 24, height: 24, borderRadius: 12,
    borderWidth: 2, borderColor: colors.borderStrong,
    justifyContent: "center", alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
  },
  checkboxActive: { backgroundColor: colors.brandPrimary, borderColor: colors.brandPrimary },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.pill,
    paddingHorizontal: 4,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  stepBtn: {
    width: 28, height: 28, borderRadius: 14,
    justifyContent: "center", alignItems: "center",
  },
  qtyText: {
    minWidth: 22,
    textAlign: "center",
    fontWeight: "700",
    color: colors.onSurface,
    fontSize: fontSize.base,
  },
  footer: {
    position: "absolute",
    left: 0, right: 0, bottom: 0,
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
  addBtn: {
    backgroundColor: colors.brandPrimary,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
  },
  addText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
