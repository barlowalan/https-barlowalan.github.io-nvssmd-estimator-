/**
 * ExplorerPolicy limit gates (mirrors frontend/src/explorerPolicy.ts).
 */
describe("ExplorerPolicy helpers", () => {
  const policy = {
    activeProjectLimit: 10,
    catalogRecordLimit: 50,
    laborRecordLimit: 20,
  };
  const canCreateProject = (n) => n < policy.activeProjectLimit;
  const canCreateCatalogRecord = (n) => n < policy.catalogRecordLimit;
  const canCreateLaborRecord = (n) => n < policy.laborRecordLimit;

  test("allows projects under limit", () => {
    expect(canCreateProject(0)).toBe(true);
    expect(canCreateProject(9)).toBe(true);
  });

  test("blocks projects at limit", () => {
    expect(canCreateProject(10)).toBe(false);
  });

  test("catalog and labor gates", () => {
    expect(canCreateCatalogRecord(49)).toBe(true);
    expect(canCreateCatalogRecord(50)).toBe(false);
    expect(canCreateLaborRecord(19)).toBe(true);
    expect(canCreateLaborRecord(20)).toBe(false);
  });
});
