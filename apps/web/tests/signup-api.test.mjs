import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";

const require = createRequire(import.meta.url);
const zod = require("../../../packages/features/node_modules/zod");
function compile(path, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, require: (id) => { assert.ok(id in modules, `Unexpected import ${id}`); return modules[id]; }, TextEncoder, console });
  return exports;
}
const schema = compile("../../../packages/features/schemas/signup-schema.ts", { zod });
const roles = { id: "role.id", name: "role.name" };
const users = { id: "user.id", email: "user.email" };
const subcounty = { id: "subcounty.id", isActive: "subcounty.active" };
function harness(rolePresent = true) {
  const inserts = [];
  const queries = [];
  const db = {
    select: () => ({ from: (table) => ({ where: (condition) => ({ limit: async () => {
      queries.push({ table, condition });
      if (table === roles) return rolePresent ? [{ id: "scde-id" }] : [];
      if (table === subcounty) return [{ id: "area" }];
      return [];
    } }) }) }),
    insert: () => ({ values: async (value) => { inserts.push(value); } }),
    update: () => ({ set: () => ({ where: () => ({ returning: async () => [{ id: "area" }] }) }) }),
    transaction: async (fn) => fn(db),
  };
  const routes = compile("../app/api/auth/signup/route.ts", {
    "next/server": { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), init) } },
    "drizzle-orm": { eq: (field, value) => ({ field, value }), and: (...values) => values, sql: () => "email" },
    "bcryptjs": { __esModule: true, default: { hash: async () => "hashed" } },
    "@scsms/db/postgres": { db },
    "@scsms/db/postgress-schemas/user": { roles, users },
    "@scsms/db/postgress-schemas/subcounty_ward": { subcounty },
    "@scsms/features/schemas/signup-schema": schema,
  });
  return { inserts, queries, request: (body) => routes.POST(new Request("http://localhost/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })) };
}
const request = { name: "Officer", email: "officer@example.com", phone: "", password: "password123", subcountyId: "area", knecCode: "00123", roleId: "administrator" };
test("signup ignores an injected role and assigns inactive SCDE", async () => {
  const app = harness();
  assert.equal((await app.request(request)).status, 201);
  assert.equal(app.inserts[0].roleId, "scde-id");
  assert.equal(app.inserts[0].status, "inactive");
  assert.equal(app.inserts[0].username, "SCDE00123");
  assert.equal(app.queries.find((query) => query.table === roles).condition.value, "scde");
});
test("signup fails closed when SCDE is unavailable", async () => {
  const app = harness(false);
  assert.equal((await app.request(request)).status, 503);
  assert.equal(app.inserts.length, 0);
});
