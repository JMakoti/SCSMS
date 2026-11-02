import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function load(relativePath, modules = {}, globals = {}) {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, { exports, require: (name) => {
    assert.ok(modules[name], `Unexpected import: ${name}`);
    return modules[name];
  }, ...globals });
  return exports;
}
const completeness = load("../../../packages/features/data/completeness.ts");
const rules = load("../../../packages/features/notifications/school-notifications.ts", { "../data/completeness": completeness });
const { buildSchoolNotifications, notificationReadToken } = rules;
const school = {
  id: "school-1", displayName: "Test Primary", officialName: "Test Primary School", schoolCode: "001",
  isActive: true, registrationStatus: "Registered", institutionType: "PRIMARY", ownershipType: "PUBLIC",
  genderType: "MIXED", boardingType: "DAY", titleDeed: "NO", sne: "NO", county: "Kilifi",
  subCounty: "Rabai", ward: "Test Ward", location: "Test Location", address: "PO Box 1",
  phone: "0700000000", email: "school@example.test", latitude: 0, longitude: 0,
};
function fixture() {
  return {
    schools: [{ ...school }],
    enrollmentRows: [{ schoolId: school.id, academicYearId: "ay-2026", grade: "Grade 1", male: 12, female: 8, total: 20 }],
    infrastructureFacilities: [{ schoolId: school.id, academicYearId: "ay-2026", facility: "Classrooms", available: 4, good: 4, needsRepair: 0 }],
    staff: [{ schoolId: school.id }], contacts: [], syncRecords: [], profile: { email: "officer@example.test" },
  };
}
const alerts = (data) => buildSchoolNotifications(data, "ay-2026", "2026");

test("complete school records have no fabricated notifications", () => {
  assert.equal(alerts(fixture()).length, 0);
});

test("missing enrollment alerts link to the school's enrollment tab and resolve when added", () => {
  const data = fixture();
  const rows = data.enrollmentRows;
  data.enrollmentRows = [];
  const [notice] = alerts(data);
  assert.equal(notice.category, "enrollment");
  assert.match(notice.title, /not been added/);
  assert.equal(notice.href, "/schools?school=school-1&tab=Enrollment");
  data.enrollmentRows = rows;
  assert.equal(alerts(data).length, 0);
});

test("older academic year records do not satisfy the selected year's missing records", () => {
  const data = fixture();
  data.enrollmentRows[0].academicYearId = "ay-2025";
  data.infrastructureFacilities[0].academicYearId = "ay-2025";
  const items = alerts(data);
  assert.equal(items.length, 2);
  assert.ok(items.some((item) => item.category === "enrollment"));
  assert.ok(items.some((item) => item.category === "infrastructure"));
  assert.ok(items.every((item) => item.description.includes("2026")));
});

test("zero enrollment is a review alert, not an assertion that records are missing", () => {
  const data = fixture();
  Object.assign(data.enrollmentRows[0], { male: 0, female: 0, total: 0 });
  const [notice] = alerts(data);
  assert.equal(notice.title, "Review enrollment counts");
  assert.equal(notice.severity, "info");
  assert.match(notice.description, /Confirm/);
});

test("an inconsistent grade total raises a correction alert", () => {
  const data = fixture();
  data.enrollmentRows[0].total = 99;
  assert.equal(alerts(data)[0].title, "Enrollment totals need correction");
});

test("inactive schools do not produce missing record alerts", () => {
  const data = fixture();
  data.schools[0].isActive = false;
  data.enrollmentRows = [];
  data.staff = [];
  assert.equal(alerts(data).length, 0);
});

test("repair notifications clear after facilities are repaired", () => {
  const data = fixture();
  data.infrastructureFacilities[0].needsRepair = 2;
  const [notice] = alerts(data);
  assert.equal(notice.title, "Facilities need repair");
  assert.match(notice.description, /Classrooms: 2/);
  assert.match(notice.href, /tab=Infrastructure/);
  data.infrastructureFacilities[0].needsRepair = 0;
  assert.equal(alerts(data).length, 0);
});

test("an active contact phone resolves missing school contact details", () => {
  const data = fixture();
  data.schools[0].phone = null;
  data.schools[0].email = null;
  assert.equal(alerts(data)[0].category, "contacts");
  data.contacts = [{ schoolId: school.id, phone: "0700000000", phone2: "", isActive: false }];
  assert.equal(alerts(data)[0].category, "contacts");
  data.contacts[0].isActive = true;
  assert.equal(alerts(data).length, 0);
});

test("missing staff and incomplete school details have direct review links", () => {
  const data = fixture();
  data.staff = [];
  data.schools[0].ward = null;
  const items = alerts(data);
  assert.ok(items.some((item) => item.category === "staff" && item.href.endsWith("tab=Staff")));
  assert.ok(items.some((item) => item.category === "school" && item.description.includes("Ward") && item.href.endsWith("tab=Overview")));
});

test("sync failures take priority and exclude successfully synced records", () => {
  const data = fixture();
  data.enrollmentRows = [];
  data.syncRecords = [{ status: "failed" }, { status: "synced" }];
  const [notice] = alerts(data);
  assert.equal(notice.severity, "error");
  assert.equal(notice.href, "/synchronization");
  assert.match(notice.description, /^1 record needs/);
});

test("changed issues become unread again and school IDs are safely encoded", () => {
  const data = fixture();
  data.schools[0].id = "school & one";
  const [first] = alerts(data);
  assert.match(first.href, /school=school%20%26%20one/);
  assert.notEqual(notificationReadToken(first), notificationReadToken({ ...first, description: "Changed issue" }));
});

function hookHarness({ blockedStorage = false } = {}) {
  let data = fixture();
  data.enrollmentRows = [];
  let year = { id: "ay-2026", name: "2026" };
  const storage = new Map();
  const slots = [];
  let cursor = 0;
  const same = (a, b) => a && a.length === b.length && a.every((item, index) => item === b[index]);
  const react = {
    useMemo(callback, deps) {
      const index = cursor++;
      if (!same(slots[index]?.deps, deps)) slots[index] = { deps, value: callback() };
      return slots[index].value;
    },
    useCallback(callback, deps) { return react.useMemo(() => callback, deps); },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useSyncExternalStore: (_subscribe, snapshot) => snapshot(),
  };
  const { useNotifications: runNotifications } = load("../../../packages/features/notifications/use-notifications.ts", {
    react,
    "../data/feature-data-context": { useFeatureData: () => data },
    "../academic-years/academic-year-context": { useAcademicYear: () => ({ currentAcademicYear: year }) },
    "../data/sync-context": { useSyncState: () => null },
    "./school-notifications": rules,
  }, {
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => { if (blockedStorage) throw new Error("Storage full"); storage.set(key, value); },
    },
    window: { dispatchEvent() {} }, Event,
  });
  return {
    render() { cursor = 0; return runNotifications(); },
    account(email) { data = { ...data, profile: { email } }; },
    year(id) { year = { id, name: id.replace("ay-", "") }; },
    resolve() { data = { ...data, enrollmentRows: fixture().enrollmentRows }; },
  };
}

test("marking a notification read updates its badge and a resolved issue disappears", () => {
  const app = hookHarness();
  let state = app.render();
  assert.equal(state.unreadCount, 1);
  state.markRead(state.notifications);
  state = app.render();
  assert.equal(state.unreadCount, 0);
  assert.equal(state.notifications.length, 1);
  app.resolve();
  assert.equal(app.render().notifications.length, 0);
});

test("read status is isolated by account and academic year", () => {
  const app = hookHarness();
  let state = app.render();
  state.markRead(state.notifications);
  app.account("other@example.test");
  assert.equal(app.render().unreadCount, 1);
  app.account("officer@example.test");
  assert.equal(app.render().unreadCount, 0);
  app.year("ay-2025");
  assert.ok(app.render().unreadCount > 0);
  app.year("ay-2026");
  assert.equal(app.render().unreadCount, 0);
});

test("read status still works in memory when browser storage is full", () => {
  const app = hookHarness({ blockedStorage: true });
  const state = app.render();
  state.markRead(state.notifications);
  assert.equal(app.render().unreadCount, 0);
});
