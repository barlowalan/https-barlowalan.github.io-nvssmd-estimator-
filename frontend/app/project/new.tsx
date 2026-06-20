import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api } from "@/src/api";

const TYPES = ["Commercial", "Federal", "Union"];

export default function NewProjectScreen() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [customer, setCustomer] = useState("");
  const [site, setSite] = useState("");
  const [type, setType] = useState("Commercial");
  const [cameras, setCameras] = useState("0");
  const [doors, setDoors] = useState("0");
  const [ids, setIds] = useState("0");
  const [intercoms, setIntercoms] = useState("0");
  const [cable, setCable] = useState("0");
  const [submitting, setSubmitting] = useState(false);

  const onCreate = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const project = await api.createProject({
        name: name.trim(),
        customer: customer.trim(),
        site: site.trim(),
        project_type: type,
        scope_notes: "",
        overhead_pct: 10,
        profit_pct: 12,
        contingency_pct: 5,
        counts: {
          cameras: parseInt(cameras || "0", 10),
          doors: parseInt(doors || "0", 10),
          ids_points: parseInt(ids || "0", 10),
          intercoms: parseInt(intercoms || "0", 10),
          cable_runs: parseInt(cable || "0", 10),
        },
      });
      router.replace(`/project/${project.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="close-new-project" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title}>New Project</Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 120 }}>
          <Field label="Project Name *">
            <TextInput
              testID="input-project-name"
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="e.g. Federal Courthouse - Phase 2"
              placeholderTextColor={colors.muted}
            />
          </Field>
          <Field label="Customer">
            <TextInput
              testID="input-customer"
              style={styles.input}
              value={customer}
              onChangeText={setCustomer}
              placeholder="GSA, prime contractor, etc."
              placeholderTextColor={colors.muted}
            />
          </Field>
          <Field label="Site">
            <TextInput
              testID="input-site"
              style={styles.input}
              value={site}
              onChangeText={setSite}
              placeholder="Address or building name"
              placeholderTextColor={colors.muted}
            />
          </Field>

          <Field label="Project Type">
            <View style={styles.typeRow}>
              {TYPES.map((t) => (
                <Pressable
                  key={t}
                  testID={`type-${t.toLowerCase()}`}
                  onPress={() => setType(t)}
                  style={[styles.typePill, type === t && styles.typePillActive]}
                >
                  <Text style={[styles.typeText, type === t && styles.typeTextActive]}>{t}</Text>
                </Pressable>
              ))}
            </View>
          </Field>

          <Text style={styles.section}>System Counts</Text>
          <View style={styles.countsGrid}>
            <CountField label="CCTV Cameras" value={cameras} onChange={setCameras} testID="count-cameras" />
            <CountField label="ACS Doors" value={doors} onChange={setDoors} testID="count-doors" />
            <CountField label="IDS Points" value={ids} onChange={setIds} testID="count-ids" />
            <CountField label="Intercoms" value={intercoms} onChange={setIntercoms} testID="count-intercoms" />
            <CountField label="Cable Runs" value={cable} onChange={setCable} testID="count-cable" />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          testID="submit-new-project"
          onPress={onCreate}
          disabled={!name.trim() || submitting}
          style={({ pressed }) => [
            styles.cta,
            (!name.trim() || submitting) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          <Text style={styles.ctaText}>{submitting ? "Creating..." : "Create Project"}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: spacing.lg }}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

function CountField({
  label,
  value,
  onChange,
  testID,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.countCard}>
      <Text style={styles.countLabel}>{label}</Text>
      <TextInput
        testID={testID}
        style={styles.countInput}
        value={value}
        onChangeText={onChange}
        keyboardType="number-pad"
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
  },
  title: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  label: { fontSize: fontSize.sm, fontWeight: "600", color: colors.muted, marginBottom: 6 },
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
  typeRow: { flexDirection: "row", gap: spacing.sm },
  typePill: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceSecondary,
    alignItems: "center",
  },
  typePillActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  typeText: { fontSize: fontSize.base, color: colors.muted, fontWeight: "600" },
  typeTextActive: { color: colors.onBrandTertiary },
  section: {
    fontSize: fontSize.sm,
    fontWeight: "700",
    color: colors.muted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginVertical: spacing.md,
  },
  countsGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  countCard: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  countLabel: { fontSize: fontSize.sm, color: colors.muted, marginBottom: spacing.xs },
  countInput: {
    fontSize: fontSize.xxl,
    fontWeight: "700",
    color: colors.onSurface,
    padding: 0,
  },
  footer: { padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  cta: { backgroundColor: colors.brandPrimary, padding: spacing.md, borderRadius: radius.md, alignItems: "center" },
  ctaText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
});
