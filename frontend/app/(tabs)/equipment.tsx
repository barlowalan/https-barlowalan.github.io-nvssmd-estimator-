import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, currency, Equipment, CATEGORIES } from "@/src/api";

export default function EquipmentScreen() {
  const router = useRouter();
  const [items, setItems] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const list = await api.listEquipment(category === "all" ? undefined : category);
      setItems(list);
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

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Equipment Library</Text>
        <View style={{ flexDirection: "row", gap: spacing.sm }}>
          <Pressable
            testID="import-equipment-button"
            onPress={() => router.push("/equipment/import")}
            style={[styles.addBtn, { backgroundColor: colors.surfaceSecondary, borderWidth: 1, borderColor: colors.border }]}
          >
            <Ionicons name="cloud-upload-outline" size={18} color={colors.brandPrimary} />
          </Pressable>
          <Pressable
            testID="add-equipment-button"
            onPress={() => router.push("/equipment/new")}
            style={styles.addBtn}
          >
            <Ionicons name="add" size={20} color={colors.onBrandPrimary} />
          </Pressable>
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
          contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}
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
          renderItem={({ item }) => (
            <View style={styles.row} testID={`equipment-row-${item.id}`}>
              <View style={styles.rowIcon}>
                <Ionicons name="hardware-chip-outline" size={20} color={colors.brandPrimary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle} numberOfLines={1}>
                  {item.manufacturer} {item.model}
                </Text>
                <Text style={styles.rowSub}>
                  {item.category} · {currency(item.cost)} · {item.lead_time_days}d lead
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
              <Pressable
                onPress={() => onDelete(item.id)}
                hitSlop={8}
                testID={`delete-equipment-${item.id}`}
              >
                <Ionicons name="trash-outline" size={18} color={colors.error} />
              </Pressable>
            </View>
          )}
        />
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
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.brandPrimary,
    justifyContent: "center",
    alignItems: "center",
  },
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
  rowIcon: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
  },
  rowTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.onSurface },
  rowSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  tagsRow: { flexDirection: "row", gap: 6, marginTop: 6 },
  tag: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  tagText: { fontSize: 11, fontWeight: "600", color: colors.onSurfaceTertiary },
});
