import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function renderFor(role) {
  const exports = {};
  const oldPage = function OldUsersPage() {};
  let privilegedCalls = 0;
  const compiled = ts.transpileModule(readFileSync(new URL("../app/(dashboard)/users/page.tsx", import.meta.url), "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  const modules = {
    "react/jsx-runtime": { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) },
    "react": {},
    "@tauri-apps/api/core": { invoke: () => { privilegedCalls++; } },
    "lucide-react": {},
    "@scsms/features/ui/page-header": { __esModule: true, default: () => null },
    "@scsms/features/pages/module-route-page": { __esModule: true, default: oldPage },
    "@/app/session-context": { useDesktopRole: () => role },
    "./review.module.css": { __esModule: true, default: {} },
  };
  vm.runInNewContext(compiled, { exports, require: (id) => { assert.ok(id in modules, `Unexpected import ${id}`); return modules[id]; } });
  return { page: exports.default(), oldPage, privilegedCalls };
}

test("SCDE and other non-administrators see the previous users page", () => {
  for (const role of ["scde", "officer", null]) {
    const result = renderFor(role);
    assert.equal(result.page.type, result.oldPage);
    assert.equal(result.page.props.active, "Users & Roles");
    assert.equal(result.privilegedCalls, 0);
  }
});

test("administrators see account management", () => {
  const result = renderFor(" Administrator ");
  assert.equal(result.page.type.name, "AccountManagementPage");
  assert.equal(result.privilegedCalls, 0);
});
