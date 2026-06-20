import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, CATEGORIES } from "@/src/api";

export default function NewEquipment() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("");
  const [model, setModel] = useState("");
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [cost, setCost] = useState("0");
  const [ndaa, setNdaa] = useState(false);
  const [lead, setLead] = useState("0");
  const [warranty, setWarranty] = useState("1");
  const [saving, setSaving] = useState(false);

  const canSave = manufacturer.trim() && model.trim();

  const onSubmit = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      await api.createEquipment({
        manufacturer: manufacturer.trim(),
        model: model.trim(),
        category,
        cost: parseFloat(cost || "0"),
        ndaa,
        lead_time_days: parseInt(lead || "0", 10),
        warranty_years: parseInt(warranty || "1", 10),
      });
      router.back();
    } finally {
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="close-new-eq" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Equipment</Text>
        <View style={{ width: 26 }} />
      </View>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 140 }}>
          <Label text="Manufacturer *" />
          <TextInput
            testID="eq-manufacturer"
            style={styles.input}
            value={manufacturer}
            onChangeText={setManufacturer}
            placeholder="Axis, Hikvision, Mercury..."
            placeholderTextColor={colors.muted}
          />
          <Label text="Model *" />
          <TextInput
            testID="eq-model"
            style={styles.input}
            value={model}
            onChangeText={setModel}
            placeholder="e.g. P3265-LVE"
            placeholderTextColor={colors.muted}
          />

          <Label text="Category" />
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing.sm, paddingVertical: 4 }}
          >
            {CATEGORIES.map((c) => (
              <Pressable
                key={c}
                testID={`eq-cat-${c.replace(/[/\s]/g, "-").toLowerCase()}`}
                onPress={() => setCategory(c)}
                style={[styles.cat, category === c && styles.catActive]}
              >
                <Text style={[styles.catText, category === c && styles.catTextActive]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Cost ($)" />
              <TextInput
                testID="eq-cost"
                style={styles.input}
                value={cost}
                onChangeText={setCost}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Label text="Lead Time (days)" />
              <TextInput
                testID="eq-lead"
                style={styles.input}
                value={lead}
                onChangeText={setLead}
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Label text="Warranty (yrs)" />
              <TextInput
                testID="eq-warranty"
                style={styles.input}
                value={warranty}
                onChangeText={setWarranty}
                keyboardType="number-pad"
              />
            </View>
            <View style={{ flex: 1, justifyContent: "flex-end", paddingBottom: 8 }}>
              <View style={styles.switchRow}>
                <Text style={styles.switchLabel}>NDAA Compliant</Text>
                <Switch
                  testID="eq-ndaa"
                  value={ndaa}
                  onValueChange={setNdaa}
                  trackColor={{ true: colors.brandPrimary, false: colors.border }}
                />
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <View style={styles.footer}>
        <Pressable
          testID="submit-new-eq"
          onPress={onSubmit}
          disabled={!canSave || saving}
          style={({ pressed }) => [
            styles.cta,
            (!canSave || saving) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{saving ? "Adding..." : "Add Equipment"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Label({ text }: { text: string }) {
  return <Text style={styles.label}>{text}</Text>;
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
  label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.muted, marginTop: spacing.md, marginBottom: 6 },
  input: {
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: 12,
    fontSize: fontSize.lg, color: colors.onSurface,
  },
  row: { flexDirection: "row", gap: spacing.md },
  cat: {
    paddingHorizontal: spacing.md, paddingVertical: 8,
    borderRadius: radius.pill,
    borderWidth: 1, borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    flexShrink: 0,
  },
  catActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  catText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
  catTextActive: { color: colors.onBrandTertiary },
  switchRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md, padding: spacing.md,
    borderWidth: 1, borderColor: colors.border,
  },
  switchLabel: { fontSize: fontSize.base, color: colors.onSurface, fontWeight: "600" },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  cta: { backgroundColor: colors.brandPrimary, padding: spacing.md, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
