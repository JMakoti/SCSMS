import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadFeature(path, overrides = {}) {
  const source = fs.readFileSync(new URL(`../../../packages/features/${path}`, import.meta.url), "utf8");
  const modules = Object.fromEntries([...source.matchAll(/from "([^"]+)"/g)].map((match) => [
    match[1], new Proxy({}, { get: (_, key) => key }),
  ]));
  const jsx = (type, props) => ({ type, props });
  Object.assign(modules, {
    "react/jsx-runtime": { jsx, jsxs: jsx, Fragment: "fragment" },
    react: { useState: (value) => [value, () => {}] },
    ...overrides,
  });
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText, { exports, require: (id) => modules[id] });
  return exports;
}

function findAll(node, matches) {
  if (!node || typeof node !== "object") return [];
  return [
    ...(matches(node) ? [node] : []),
    ...[].concat(node.props?.children ?? []).flatMap((child) =>
      Array.isArray(child) ? child.flatMap((item) => findAll(item, matches)) : findAll(child, matches)),
  ];
}

test("the topbar ends with a logout button and contains no account dropdown", () => {
  let loggedOut = false;
  const { Topbar } = loadFeature("navigation/topbar.tsx");
  const tree = Topbar({ onLogout: () => { loggedOut = true; } });
  assert.equal(findAll(tree, (node) => node.props?.className === "user-dropdown").length, 0);
  const actions = tree.props.children.at(-1).props.children;
  const logout = actions.at(-1);
  assert.equal(logout.type, "button");
  assert.equal(logout.props["aria-label"], "Log out");
  logout.props.onClick();
  assert.equal(loggedOut, true);
});

for (const roles of [[], ["Education Officer", "Records Viewer", "Custom Role"]]) {
  test(`only Education Officer opens the signed-in profile (${roles.length ? "configured" : "default"} roles)`, () => {
    const navigations = [];
    const { GenericPage } = loadFeature("pages/generic-page.tsx", {
      "next/navigation": { useRouter: () => ({ push: (path) => navigations.push(path) }) },
      "../data/feature-data-context": {
        useFeatureData: () => ({
          schools: [], staff: [], wards: [], auditLogRecords: [], reportTemplates: [],
          moduleRecords: { "Users & Roles": roles },
          profile: { email: "officer@example.com" },
        }),
      },
      "../data/report-templates": { getReportTemplates: () => [] },
    });
    const tree = GenericPage({ active: "Users & Roles" });
    const rows = findAll(tree, (node) => node.props?.className === "module-row");
    const buttons = rows.flatMap((row) => findAll(row, (node) => node.type === "button"));
    const enabled = buttons.filter((button) => !button.props.disabled);
    assert.equal(enabled.length, 1);
    const statuses = rows.flatMap((row) => findAll(row, (node) => "status" in (node.props ?? {})));
    assert.equal(statuses.filter((node) => node.props.status === "Active").length, 1);
    assert.equal(statuses.filter((node) => node.props.status === "Inactive").length, rows.length - 1);
    assert.match(JSON.stringify(rows[0]), /officer@example.com/);
    enabled[0].props.onClick();
    assert.deepEqual(navigations, ["/profile"]);
  });
}
