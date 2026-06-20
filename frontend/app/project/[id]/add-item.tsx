import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, Equipment, LaborRates, ROLE_LABELS } from "@/src/api";

export default function AddItem() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [selectedEq, setSelectedEq] = useState<Equipment | null>(null);
  const [description, setDescription] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("0");
  const [hours, setHours] = useState("0");
  const [role, setRole] = useState<keyof LaborRates>("technician");
  const [useSellPrice, setUseSellPrice] = useState(false);
  const [saving, setSaving] = useState(false);

  useFocusEffect(
    useCallback(() => {
      api.listEquipment().then(setEquipment).catch(() => {});
    }, [])
  );

  const onSelectEq = (eq: Equipment) => {
    setSelectedEq(eq);
    setDescription(`${eq.manufacturer} ${eq.model}`);
    const price = useSellPrice && eq.sell_price ? eq.sell_price : eq.cost;
    setUnitCost(String(price));
  };

  const onToggleSellPrice = (next: boolean) => {
    setUseSellPrice(next);
    if (selectedEq) {
      const price = next && selectedEq.sell_price ? selectedEq.sell_price : selectedEq.cost;
      setUnitCost(String(price));
    }
  };

  const onSubmit = async () => {
    if (!id || !description.trim()) return;
    setSaving(true);
    try {
      await api.addItem(id, {
        description: description.trim(),
        equipment_id: selectedEq?.id || null,
        quantity: parseFloat(quantity || "0"),
        unit_cost: parseFloat(unitCost || "0"),
        labor_hours: parseFloat(hours || "0"),
        labor_role: role,
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  const lineTotal = (parseFloat(quantity || "0") || 0) * (parseFloat(unitCost || "0") || 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="back-add-item" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle}>Add Line Item</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          {equipment.length > 0 && (
            <>
              <View style={styles.sellToggleRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sellToggleTitle}>Use Sell Price</Text>
                  <Text style={styles.sellToggleSub}>
                    Apply the proposal sell price instead of dealer cost when picking from library.
                  </Text>
                </View>
                <Switch
                  testID="toggle-sell-price"
                  value={useSellPrice}
                  onValueChange={onToggleSellPrice}
                  trackColor={{ true: colors.brandPrimary, false: colors.border }}
                />
              </View>
              <Text style={styles.label}>Pick from library (optional)</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: spacing.sm, paddingBottom: spacing.md }}
              >
                {equipment.map((eq) => {
                  const price = useSellPrice && eq.sell_price ? eq.sell_price : eq.cost;
                  return (
                    <Pressable
                      key={eq.id}
                      testID={`pick-eq-${eq.id}`}
                      onPress={() => onSelectEq(eq)}
                      style={[styles.eqChip, selectedEq?.id === eq.id && styles.eqChipActive]}
                    >
                      <Text style={[styles.eqChipText, selectedEq?.id === eq.id && styles.eqChipTextActive]}>
                        {eq.manufacturer} {eq.model}
                      </Text>
                      <Text style={[styles.eqChipPrice, selectedEq?.id === eq.id && styles.eqChipPriceActive]}>
                        ${price.toFixed(2)} {useSellPrice && eq.sell_price ? "sell" : "cost"}
                      </Text>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </>
          )}

          <Text style={styles.label}>Description *</Text>
          <TextInput
            testID="input-description"
            style={styles.input}
            value={description}
            onChangeText={setDescription}
            placeholder="e.g. Hikvision DS-2CD2143"
            placeholderTextColor={colors.muted}
          />

          <View style={styles.row}>
            <NumField label="Quantity" value={quantity} onChange={setQuantity} testID="input-quantity" />
            <NumField label="Unit Cost ($)" value={unitCost} onChange={setUnitCost} testID="input-unit-cost" />
          </View>

          <NumField label="Labor Hours" value={hours} onChange={setHours} testID="input-hours" />

          <Text style={styles.label}>Labor Role</Text>
          <View style={styles.rolesGrid}>
            {(Object.keys(ROLE_LABELS) as (keyof LaborRates)[]).map((k) => (
              <Pressable
                key={k}
                testID={`role-${k}`}
                onPress={() => setRole(k)}
                style={[styles.rolePill, role === k && styles.rolePillActive]}
              >
                <Text style={[styles.roleText, role === k && styles.roleTextActive]}>
                  {ROLE_LABELS[k]}
                </Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.previewCard}>
            <Text style={styles.previewLabel}>Material subtotal</Text>
            <Text style={styles.previewValue}>
              ${lineTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          testID="submit-add-item"
          onPress={onSubmit}
          disabled={!description.trim() || saving}
          style={({ pressed }) => [
            styles.cta,
            (!description.trim() || saving) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{saving ? "Adding..." : "Add to Estimate"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function NumField({
  label, value, onChange, testID,
}: {
  label: string; value: string; onChange: (v: string) => void; testID: string;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        testID={testID}
        style={styles.input}
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
      />
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
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.muted, marginBottom: 6, marginTop: spacing.md },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    fontSize: fontSize.lg,
    color: colors.onSurface,
  },
  row: { flexDirection: "row", gap: spacing.md },
  eqChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    flexShrink: 0,
    alignItems: "flex-start",
  },
  eqChipActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  eqChipText: { fontSize: fontSize.sm, color: colors.onSurface, fontWeight: "600" },
  eqChipTextActive: { color: colors.onBrandTertiary },
  eqChipPrice: { fontSize: 11, color: colors.muted, marginTop: 2, fontWeight: "600" },
  eqChipPriceActive: { color: colors.brandPrimary },
  sellToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  sellToggleTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.onSurface },
  sellToggleSub: { fontSize: 11, color: colors.muted, marginTop: 2, lineHeight: 16 },
  rolesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  rolePill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
  },
  rolePillActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  roleText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
  roleTextActive: { color: colors.onBrandTertiary },
  previewCard: {
    marginTop: spacing.xl,
    padding: spacing.lg,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  previewLabel: { fontSize: fontSize.base, color: colors.onBrandTertiary, fontWeight: "600" },
  previewValue: { fontSize: fontSize.xl, color: colors.onBrandTertiary, fontWeight: "700" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  cta: { backgroundColor: colors.brandPrimary, padding: spacing.md, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
