import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  FlatList,
  RefreshControl,
  ActivityIndicator,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useFocusEffect } from "expo-router";

import { colors, spacing, radius, fontSize } from "@/src/theme";
import { api, currency, Project, EstimateSummary } from "@/src/api";

type ProjectCard = Project & { estimate?: EstimateSummary };

export default function ProjectsScreen() {
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const list = await api.listProjects();
      const enriched = await Promise.all(
        list.map(async (p) => {
          try {
            const est = await api.estimate(p.id);
            return { ...p, estimate: est };
          } catch {
            return p;
          }
        })
      );
      setProjects(enriched);
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    load();
  }, [load]);

  const totalValue = projects.reduce((s, p) => s + (p.estimate?.total || 0), 0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <View style={styles.brandRow}>
          <Image
            source={require("@/assets/images/logo.png")}
            style={styles.logo}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.brand}>SECURITY ESTIMATOR PRO</Text>
            <Text style={styles.title}>Projects</Text>
          </View>
        </View>
        <View style={styles.headerStats} testID="projects-pipeline-value">
          <Text style={styles.statLabel}>Pipeline</Text>
          <Text style={styles.statValue}>{currency(totalValue)}</Text>
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
          contentContainerStyle={{
            padding: spacing.lg,
            paddingBottom: 140,
          }}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandPrimary} />
          }
          ListEmptyComponent={
            <View style={styles.empty} testID="projects-empty">
              <View style={styles.emptyIconWrap}>
                <Ionicons name="folder-open-outline" size={36} color={colors.brandPrimary} />
              </View>
              <Text style={styles.emptyTitle}>No projects yet</Text>
              <Text style={styles.emptySub}>
                Start your first security estimate. Track devices, labor, and full project pricing in one place.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <Pressable
              testID={`project-card-${item.id}`}
              onPress={() => router.push(`/project/${item.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
            >
              <View style={styles.cardRow}>
                <View style={styles.cardIcon}>
                  <Ionicons name="shield-checkmark-outline" size={20} color={colors.brandPrimary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.name}</Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {item.customer || "—"} · {item.project_type}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </View>
              <View style={styles.metricsRow}>
                <Metric label="Cameras" value={item.counts.cameras} />
                <Metric label="Doors" value={item.counts.doors} />
                <Metric label="IDS" value={item.counts.ids_points} />
                <Metric label="Cabling" value={item.counts.cable_runs} />
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.footerLabel}>Estimated Sell</Text>
                <Text style={styles.footerValue}>
                  {item.estimate ? currency(item.estimate.total) : "—"}
                </Text>
              </View>
            </Pressable>
          )}
        />
      )}

      <Pressable
        testID="create-project-fab"
        onPress={() => router.push("/project/new")}
        style={({ pressed }) => [styles.fab, pressed && { transform: [{ scale: 0.96 }] }]}
      >
        <Ionicons name="add" size={26} color={colors.onBrandPrimary} />
        <Text style={styles.fabText}>New Project</Text>
      </Pressable>
    </SafeAreaView>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.metricBox}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  brand: {
    fontSize: fontSize.sm,
    color: colors.brandPrimary,
    fontWeight: "700",
    letterSpacing: 2,
  },
  brandRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  logo: { width: 44, height: 44 },
  title: { fontSize: 28, fontWeight: "700", color: colors.onSurface, marginTop: 2 },
  headerStats: { alignItems: "flex-end" },
  statLabel: { fontSize: fontSize.sm, color: colors.muted },
  statValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.brandPrimary },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { alignItems: "center", paddingHorizontal: spacing.xl, paddingTop: spacing.xxxl },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: spacing.lg,
  },
  emptyTitle: { fontSize: fontSize.xl, fontWeight: "700", color: colors.onSurface },
  emptySub: {
    fontSize: fontSize.base,
    color: colors.muted,
    textAlign: "center",
    marginTop: spacing.sm,
    lineHeight: 20,
  },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.brandTertiary,
    justifyContent: "center",
    alignItems: "center",
  },
  cardTitle: { fontSize: fontSize.lg, fontWeight: "600", color: colors.onSurface },
  cardSub: { fontSize: fontSize.sm, color: colors.muted, marginTop: 2 },
  metricsRow: {
    flexDirection: "row",
    marginTop: spacing.lg,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
  },
  metricBox: { flex: 1, alignItems: "center" },
  metricValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.onSurface },
  metricLabel: { fontSize: 11, color: colors.muted, marginTop: 2 },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerLabel: { fontSize: fontSize.sm, color: colors.muted },
  footerValue: { fontSize: fontSize.lg, fontWeight: "700", color: colors.brandPrimary },
  fab: {
    position: "absolute",
    right: spacing.lg,
    bottom: 100,
    backgroundColor: colors.brandPrimary,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  fabText: { color: colors.onBrandPrimary, fontWeight: "700", fontSize: fontSize.base },
});
