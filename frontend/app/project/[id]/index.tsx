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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import {
  api,
  currency,
  Project,
  EstimateItem,
  EstimateSummary,
  ProjectDocuments,
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
  const [sharing, setSharing] = useState(false);

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

  const onSharePdf = async () => {
    if (!id || !project || !estimate) return;
    setSharing(true);
    try {
      let docs: ProjectDocuments | null = null;
      try {
        docs = await api.getDocuments(id);
      } catch {
        docs = null;
      }
      const html = buildProjectHtml(project, estimate, items, docs);
      const { uri } = await Print.printToFileAsync({ html });
      const ok = await Sharing.isAvailableAsync();
      if (ok) {
        await Sharing.shareAsync(uri, {
          mimeType: "application/pdf",
          dialogTitle: `${project.name} - Project Estimate`,
          UTI: "com.adobe.pdf",
        });
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setSharing(false);
    }
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
        <View style={styles.headerActions}>
          <Pressable
            testID="share-project-pdf"
            onPress={onSharePdf}
            disabled={sharing}
            hitSlop={10}
            style={styles.headerAction}
          >
            {sharing ? (
              <ActivityIndicator color={colors.brandPrimary} size="small" />
            ) : (
              <Ionicons name="share-outline" size={22} color={colors.brandPrimary} />
            )}
          </Pressable>
          <Pressable testID="delete-project" onPress={onDeleteProject} hitSlop={10} style={styles.headerAction}>
            <Ionicons name="trash-outline" size={22} color={colors.error} />
          </Pressable>
        </View>
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

        <Text style={styles.section}>Documents</Text>
        <View style={styles.docsRow}>
          <DocTile
            testID="doc-scope"
            icon="document-text-outline"
            title="Scope"
            sub="Division 28 language"
            onPress={() =>
              router.push({ pathname: "/project/[id]/documents", params: { id: project.id, tab: "scope" } })
            }
          />
          <DocTile
            testID="doc-proposal"
            icon="newspaper-outline"
            title="Proposal"
            sub="Exec summary & price"
            onPress={() =>
              router.push({ pathname: "/project/[id]/documents", params: { id: project.id, tab: "proposal" } })
            }
          />
          <DocTile
            testID="doc-boe"
            icon="analytics-outline"
            title="BOE"
            sub="Basis of estimate"
            onPress={() =>
              router.push({ pathname: "/project/[id]/documents", params: { id: project.id, tab: "boe" } })
            }
          />
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
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <Pressable
              testID="pick-products-btn"
              onPress={() => router.push({ pathname: "/project/[id]/pick-products", params: { id: project.id } })}
              style={styles.addItemBtn}
            >
              <Ionicons name="cube-outline" size={16} color={colors.brandPrimary} />
              <Text style={styles.addItemText}>Pick</Text>
            </Pressable>
            <Pressable
              testID="add-item-btn"
              onPress={() => router.push({ pathname: "/project/[id]/add-item", params: { id: project.id } })}
              style={styles.addItemBtn}
            >
              <Ionicons name="add" size={16} color={colors.brandPrimary} />
              <Text style={styles.addItemText}>Custom</Text>
            </Pressable>
          </View>
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

function DocTile({
  testID, icon, title, sub, onPress,
}: {
  testID: string; icon: any; title: string; sub: string; onPress: () => void;
}) {
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.docTile, pressed && { opacity: 0.8 }]}
    >
      <View style={styles.docIcon}>
        <Ionicons name={icon} size={20} color={colors.brandPrimary} />
      </View>
      <Text style={styles.docTitle}>{title}</Text>
      <Text style={styles.docSub} numberOfLines={1}>{sub}</Text>
    </Pressable>
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
  docsRow: { flexDirection: "row", gap: spacing.sm },
  docTile: {
    flex: 1,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "flex-start",
  },
  docIcon: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center", alignItems: "center",
    marginBottom: spacing.sm,
  },
  docTitle: { fontSize: fontSize.base, fontWeight: "700", color: colors.onSurface },
  docSub: { fontSize: 11, color: colors.muted, marginTop: 2 },
  headerActions: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  headerAction: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
});

function escapeHtml(s: string) {
  return (s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br/>");
}

function buildProjectHtml(
  project: Project,
  est: EstimateSummary,
  items: EstimateItem[],
  docs: ProjectDocuments | null
): string {
  const today = new Date().toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const c = project.counts;
  const itemRows = items
    .map(
      (it) => `
      <tr>
        <td>${escapeHtml(it.description)}</td>
        <td class="num">${it.quantity}</td>
        <td class="num">$${it.unit_cost.toFixed(2)}</td>
        <td class="num">${it.labor_hours}</td>
        <td>${escapeHtml(ROLE_LABELS[it.labor_role] || it.labor_role)}</td>
        <td class="num">$${(it.quantity * it.unit_cost).toFixed(2)}</td>
      </tr>`
    )
    .join("");

  const docSection = (title: string, fields: { label: string; value: string }[]) => {
    const rendered = fields
      .filter((f) => (f.value || "").trim())
      .map(
        (f) => `<div class="doc-field"><div class="doc-label">${f.label}</div><p>${escapeHtml(f.value)}</p></div>`
      )
      .join("");
    if (!rendered) return "";
    return `<section class="doc-section"><h2>${title}</h2>${rendered}</section>`;
  };

  const scope = docs?.scope;
  const proposal = docs?.proposal;
  const boe = docs?.boe;

  return `<!doctype html>
<html><head><meta charset="utf-8" /><title>${escapeHtml(project.name)} — Project Estimate</title>
<style>
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; color: #1c1c1e; padding: 32px 36px; line-height: 1.5; }
  header { border-bottom: 2px solid #5B7B6D; padding-bottom: 14px; margin-bottom: 20px; }
  .brand { color: #5B7B6D; font-weight: 700; letter-spacing: 2px; font-size: 11px; text-transform: uppercase; }
  h1 { font-size: 26px; margin: 4px 0 6px; }
  .meta { color: #6c6c70; font-size: 12px; }
  h2 { color: #3A5A4C; font-size: 14px; text-transform: uppercase; letter-spacing: 0.6px; margin-top: 22px; margin-bottom: 8px; border-bottom: 1px solid #E5E5EA; padding-bottom: 4px; }
  .grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 8px; }
  .card { background: #F9F9F7; border: 1px solid #E5E5EA; border-radius: 6px; padding: 8px 10px; }
  .card .lbl { font-size: 10px; color: #6c6c70; text-transform: uppercase; letter-spacing: 0.5px; }
  .card .val { font-size: 14px; font-weight: 600; margin-top: 2px; }
  .summary { background: #2C2C2E; color: #F9F9F7; border-radius: 8px; padding: 18px 20px; margin-top: 8px; }
  .summary .lbl-light { color: #BBD1C7; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; }
  .summary .total { font-size: 30px; font-weight: 800; margin-top: 2px; }
  .summary table { width: 100%; margin-top: 10px; border-top: 1px solid #444; padding-top: 8px; }
  .summary td { padding: 3px 0; font-size: 12px; }
  .summary td.num { text-align: right; font-weight: 600; }
  table.items { width: 100%; border-collapse: collapse; margin-top: 6px; }
  table.items th, table.items td { border-bottom: 1px solid #E5E5EA; padding: 6px 8px; font-size: 11.5px; text-align: left; }
  table.items th { background: #F0F0EE; font-weight: 600; }
  table.items td.num, table.items th.num { text-align: right; }
  section.doc-section .doc-field { margin: 10px 0; }
  section.doc-section .doc-label { font-size: 11px; color: #5B7B6D; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  section.doc-section p { white-space: pre-wrap; margin: 4px 0 0; font-size: 12px; }
  footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #E5E5EA; color: #8E8E93; font-size: 10.5px; text-align: center; }
</style></head>
<body>
  <header>
    <div class="brand">Security Estimator Pro</div>
    <h1>${escapeHtml(project.name)}</h1>
    <div class="meta">
      ${escapeHtml(project.customer || "—")} · ${escapeHtml(project.site || "—")} · ${escapeHtml(project.project_type)} · Generated ${today}
    </div>
  </header>

  <section>
    <h2>Estimate Summary</h2>
    <div class="summary">
      <div class="lbl-light">Estimated Sell Price</div>
      <div class="total">$${est.total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
      <table>
        <tr><td>Material</td><td class="num">$${est.material_cost.toFixed(2)}</td></tr>
        <tr><td>Labor</td><td class="num">$${est.labor_cost.toFixed(2)}</td></tr>
        <tr><td><strong>Subtotal</strong></td><td class="num"><strong>$${est.subtotal.toFixed(2)}</strong></td></tr>
        <tr><td>Overhead (${project.overhead_pct.toFixed(1)}%)</td><td class="num">$${est.overhead.toFixed(2)}</td></tr>
        <tr><td>Profit (${project.profit_pct.toFixed(1)}%)</td><td class="num">$${est.profit.toFixed(2)}</td></tr>
        <tr><td>Contingency (${project.contingency_pct.toFixed(1)}%)</td><td class="num">$${est.contingency.toFixed(2)}</td></tr>
      </table>
    </div>
  </section>

  <section>
    <h2>System Counts</h2>
    <div class="grid">
      <div class="card"><div class="lbl">Cameras</div><div class="val">${c.cameras}</div></div>
      <div class="card"><div class="lbl">ACS Doors</div><div class="val">${c.doors}</div></div>
      <div class="card"><div class="lbl">IDS Points</div><div class="val">${c.ids_points}</div></div>
      <div class="card"><div class="lbl">Intercoms</div><div class="val">${c.intercoms}</div></div>
      <div class="card"><div class="lbl">Cable Runs</div><div class="val">${c.cable_runs}</div></div>
    </div>
  </section>

  <section>
    <h2>Line Items (${items.length})</h2>
    ${
      items.length === 0
        ? '<p style="color:#8E8E93;font-size:12px;">No line items recorded.</p>'
        : `<table class="items">
            <thead><tr><th>Description</th><th class="num">Qty</th><th class="num">Unit Cost</th><th class="num">Hours</th><th>Role</th><th class="num">Material</th></tr></thead>
            <tbody>${itemRows}</tbody>
          </table>`
    }
  </section>

  ${
    scope
      ? docSection("Scope of Work", [
          { label: "Overview", value: scope.overview },
          { label: "Inclusions", value: scope.inclusions },
          { label: "Exclusions", value: scope.exclusions },
          { label: "Testing", value: scope.testing },
          { label: "Training", value: scope.training },
          { label: "Warranty", value: scope.warranty },
        ])
      : ""
  }
  ${
    proposal
      ? docSection("Proposal", [
          { label: "Executive Summary", value: proposal.executive_summary },
          { label: "Technical Approach", value: proposal.technical_approach },
          { label: "Price Summary", value: proposal.price_summary },
          { label: "Assumptions", value: proposal.assumptions },
          { label: "Exclusions", value: proposal.exclusions },
          { label: "Acceptance", value: proposal.acceptance },
        ])
      : ""
  }
  ${
    boe
      ? docSection("Basis of Estimate", [
          { label: "Basis of Labor", value: boe.basis_of_labor },
          { label: "Basis of Material", value: boe.basis_of_material },
          { label: "Risk Factors", value: boe.risk_factors },
          { label: "Schedule Assumptions", value: boe.schedule_assumptions },
          { label: "Clarifications", value: boe.clarifications },
        ])
      : ""
  }

  <footer>Confidential — for the addressee only.</footer>
</body></html>`;
}
