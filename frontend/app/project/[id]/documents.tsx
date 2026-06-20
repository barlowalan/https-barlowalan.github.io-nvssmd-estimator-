import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import {
  api,
  ProjectDocuments,
  DocSection,
  Project,
  ScopeDoc,
  ProposalDoc,
  BoeDoc,
} from "@/src/api";

const TABS: { key: DocSection; label: string; icon: any }[] = [
  { key: "scope", label: "Scope", icon: "document-text-outline" },
  { key: "proposal", label: "Proposal", icon: "newspaper-outline" },
  { key: "boe", label: "BOE", icon: "analytics-outline" },
];

const FIELDS: Record<DocSection, { key: string; label: string }[]> = {
  scope: [
    { key: "overview", label: "Overview" },
    { key: "inclusions", label: "Inclusions" },
    { key: "exclusions", label: "Exclusions" },
    { key: "testing", label: "Testing" },
    { key: "training", label: "Training" },
    { key: "warranty", label: "Warranty" },
  ],
  proposal: [
    { key: "executive_summary", label: "Executive Summary" },
    { key: "technical_approach", label: "Technical Approach" },
    { key: "price_summary", label: "Price Summary" },
    { key: "assumptions", label: "Assumptions" },
    { key: "exclusions", label: "Exclusions" },
    { key: "acceptance", label: "Acceptance Block" },
  ],
  boe: [
    { key: "basis_of_labor", label: "Basis of Labor" },
    { key: "basis_of_material", label: "Basis of Material" },
    { key: "risk_factors", label: "Risk Factors" },
    { key: "schedule_assumptions", label: "Schedule Assumptions" },
    { key: "clarifications", label: "Clarifications" },
  ],
};

export default function DocumentsScreen() {
  const { id, tab: initialTab } = useLocalSearchParams<{ id: string; tab?: string }>();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [docs, setDocs] = useState<ProjectDocuments | null>(null);
  const [loading, setLoading] = useState(true);
  const [section, setSection] = useState<DocSection>(
    (initialTab as DocSection) || "scope"
  );
  const [busy, setBusy] = useState<"save" | "generate" | "share" | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      const [p, d] = await Promise.all([api.getProject(id), api.getDocuments(id)]);
      setProject(p);
      setDocs(d);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const updateField = (fieldKey: string, value: string) => {
    if (!docs) return;
    setDocs({
      ...docs,
      [section]: { ...(docs[section] as any), [fieldKey]: value },
    });
    setDirty(true);
  };

  const onSave = async () => {
    if (!docs || !id) return;
    setBusy("save");
    try {
      const saved = await api.saveDocuments(id, docs);
      setDocs(saved);
      setDirty(false);
    } finally {
      setBusy(null);
    }
  };

  const onGenerate = async () => {
    if (!id) return;
    setBusy("generate");
    try {
      const fresh = await api.generateDocuments(id, section);
      setDocs(fresh);
      setDirty(false);
    } finally {
      setBusy(null);
    }
  };

  const onSharePdf = async () => {
    if (!docs || !project) return;
    setBusy("share");
    try {
      const html = buildHtml(project, docs, section);
      const { uri } = await Print.printToFileAsync({ html });
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${project.name} - ${section.toUpperCase()}`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setBusy(null);
    }
  };

  if (loading || !docs || !project) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator color={colors.brandPrimary} />
        </View>
      </SafeAreaView>
    );
  }

  const fields = FIELDS[section];
  const sectionDoc: any = docs[section];
  const isEmpty = fields.every((f) => !(sectionDoc[f.key] || "").trim());

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable testID="docs-back" onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="chevron-back" size={26} color={colors.onSurface} />
        </Pressable>
        <View style={{ flex: 1, marginHorizontal: spacing.md }}>
          <Text style={styles.headerSub} numberOfLines={1}>{project.name}</Text>
          <Text style={styles.headerTitle}>Documents</Text>
        </View>
        <Pressable
          testID="share-pdf"
          onPress={onSharePdf}
          disabled={busy !== null}
          hitSlop={10}
        >
          {busy === "share" ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : (
            <Ionicons name="share-outline" size={22} color={colors.brandPrimary} />
          )}
        </Pressable>
      </View>

      <View style={styles.tabRow}>
        {TABS.map((t) => (
          <Pressable
            key={t.key}
            testID={`doc-tab-${t.key}`}
            onPress={() => setSection(t.key)}
            style={[styles.tab, section === t.key && styles.tabActive]}
          >
            <Ionicons
              name={t.icon}
              size={16}
              color={section === t.key ? colors.brandPrimary : colors.muted}
            />
            <Text style={[styles.tabText, section === t.key && styles.tabTextActive]}>
              {t.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={{ padding: spacing.lg, paddingBottom: 200 }}>
          {isEmpty && (
            <View style={styles.banner} testID="docs-banner-empty">
              <Ionicons name="sparkles-outline" size={20} color={colors.brandPrimary} />
              <Text style={styles.bannerText}>
                Empty section. Tap <Text style={{ fontWeight: "700" }}>Auto-fill</Text> to draft from project data, then refine.
              </Text>
            </View>
          )}

          {fields.map((f) => (
            <View key={f.key} style={{ marginBottom: spacing.lg }}>
              <Text style={styles.label}>{f.label}</Text>
              <TextInput
                testID={`field-${section}-${f.key}`}
                style={styles.textarea}
                value={sectionDoc[f.key]}
                onChangeText={(v) => updateField(f.key, v)}
                multiline
                placeholder={`Add ${f.label.toLowerCase()}...`}
                placeholderTextColor={colors.muted}
                textAlignVertical="top"
              />
            </View>
          ))}
        </ScrollView>
      </KeyboardAvoidingView>

      <View style={styles.footer}>
        <Pressable
          testID="generate-defaults"
          onPress={onGenerate}
          disabled={busy !== null}
          style={({ pressed }) => [
            styles.btn,
            styles.btnSecondary,
            (pressed || busy === "generate") && { opacity: 0.85 },
          ]}
        >
          {busy === "generate" ? (
            <ActivityIndicator color={colors.brandPrimary} />
          ) : (
            <>
              <Ionicons name="sparkles" size={16} color={colors.brandPrimary} />
              <Text style={styles.btnSecondaryText}>Auto-fill</Text>
            </>
          )}
        </Pressable>
        <Pressable
          testID="save-docs"
          onPress={onSave}
          disabled={!dirty || busy !== null}
          style={({ pressed }) => [
            styles.btn,
            styles.btnPrimary,
            (!dirty || busy !== null) && { opacity: 0.5 },
            pressed && { opacity: 0.85 },
          ]}
        >
          {busy === "save" ? (
            <ActivityIndicator color={colors.onBrandPrimary} />
          ) : (
            <Text style={styles.btnPrimaryText}>{dirty ? "Save" : "Saved"}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

function buildHtml(project: Project, docs: ProjectDocuments, section: DocSection) {
  const fields = FIELDS[section];
  const sectionDoc: any = docs[section];
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const titleMap: Record<DocSection, string> = {
    scope: "Scope of Work",
    proposal: "Proposal",
    boe: "Basis of Estimate",
  };

  const rows = fields
    .map(
      (f) => `
      <section>
        <h2>${f.label}</h2>
        <p>${escapeHtml(sectionDoc[f.key]) || "<em>—</em>"}</p>
      </section>`
    )
    .join("");

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${project.name} ${titleMap[section]}</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1c1c1e; padding: 32px 36px; line-height: 1.55; }
  header { border-bottom: 2px solid #5B7B6D; padding-bottom: 12px; margin-bottom: 24px; }
  .brand { color: #5B7B6D; font-weight: 700; letter-spacing: 2px; font-size: 11px; text-transform: uppercase; }
  h1 { font-size: 26px; margin: 4px 0 6px; }
  .meta { color: #6c6c70; font-size: 12px; }
  h2 { color: #3A5A4C; font-size: 14px; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 22px; margin-bottom: 6px; border-bottom: 1px solid #E5E5EA; padding-bottom: 4px; }
  section p { white-space: pre-wrap; margin: 4px 0 0; font-size: 12.5px; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E5EA; color: #8E8E93; font-size: 10.5px; text-align: center; }
</style></head>
<body>
  <header>
    <div class="brand">Security Estimator Pro</div>
    <h1>${escapeHtml(project.name)} — ${titleMap[section]}</h1>
    <div class="meta">
      ${escapeHtml(project.customer || "")} ${project.customer ? "·" : ""} ${escapeHtml(project.site || "")}
      ${project.site ? "·" : ""} ${escapeHtml(project.project_type)} · Generated ${today}
    </div>
  </header>
  ${rows}
  <footer>Confidential — for the addressee only.</footer>
</body></html>`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerSub: { fontSize: 11, color: colors.muted, fontWeight: "600", letterSpacing: 0.5 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  tabRow: {
    flexDirection: "row",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  tabActive: { borderColor: colors.brandPrimary, backgroundColor: colors.brandTertiary },
  tabText: { fontSize: fontSize.sm, color: colors.muted, fontWeight: "600" },
  tabTextActive: { color: colors.brandPrimary },
  banner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  bannerText: { flex: 1, fontSize: fontSize.sm, color: colors.onBrandTertiary, lineHeight: 18 },
  label: { fontSize: fontSize.sm, fontWeight: "700", color: colors.muted, marginBottom: 6, letterSpacing: 0.3 },
  textarea: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    minHeight: 110,
    fontSize: fontSize.base,
    color: colors.onSurface,
    lineHeight: 20,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: radius.md,
  },
  btnPrimary: { backgroundColor: colors.brandPrimary },
  btnPrimaryText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.lg },
  btnSecondary: {
    backgroundColor: colors.brandTertiary,
    borderWidth: 1,
    borderColor: colors.brandPrimary,
  },
  btnSecondaryText: { color: colors.brandPrimary, fontWeight: "700", fontSize: fontSize.base },
});
