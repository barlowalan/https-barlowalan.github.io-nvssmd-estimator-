/**
 * SEP Explorer free-tier policy.
 * Mirrors ios/SEPExplorer/Policy/ExplorerPolicy.swift
 */
export const ExplorerPolicy = {
  tier: "Explorer",
  price: "Free",

  activeProjectLimit: 10,
  catalogRecordLimit: 50,
  laborRecordLimit: 20,

  includesDrawing: false,
  includesProjectManagement: false,
  includesFinance: false,
} as const;

export type ExplorerPolicyType = typeof ExplorerPolicy;

export function canCreateProject(activeCount: number): boolean {
  return activeCount < ExplorerPolicy.activeProjectLimit;
}

export function canCreateCatalogRecord(count: number): boolean {
  return count < ExplorerPolicy.catalogRecordLimit;
}

export function canCreateLaborRecord(count: number): boolean {
  return count < ExplorerPolicy.laborRecordLimit;
}

export function projectLimitMessage(activeCount: number): string {
  return `Explorer free tier allows up to ${ExplorerPolicy.activeProjectLimit} active projects (${activeCount}/${ExplorerPolicy.activeProjectLimit}).`;
}

export function catalogLimitMessage(count: number): string {
  return `Explorer free tier allows up to ${ExplorerPolicy.catalogRecordLimit} catalog records (${count}/${ExplorerPolicy.catalogRecordLimit}).`;
}

export function laborLimitMessage(count: number): string {
  return `Explorer free tier allows up to ${ExplorerPolicy.laborRecordLimit} labor records (${count}/${ExplorerPolicy.laborRecordLimit}).`;
}
