import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import { createRequire } from "node:module";
import ts from "typescript";
import bcrypt from "bcryptjs";

const require = createRequire(import.meta.url);
const zod = require("../../../packages/features/node_modules/zod");
function compile(path, modules) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2017, module: ts.ModuleKind.CommonJS, esModuleInterop: true },
  }).outputText, { exports, require: (id) => {
    assert.ok(id in modules, `Unexpected import ${id}`);
    return modules[id];
  }, Error, TextEncoder, URL, console: { error() {}, log() {} } });
  return exports;
}
const schemas = compile("../../../packages/features/schemas/profile-schema.ts", { zod });
const fields = new Proxy({}, { get: (_, key) => key });

function harness(path, { authenticated = true, records = [], userSubcountyId = null } = {}) {
  const updates = [];
  const db = {
    select: () => ({ from: () => ({ where: () => ({ limit: async () => records.shift() ?? [] }) }) }),
    update: () => ({ set: (values) => ({ where: (condition) => {
      updates.push({ values, condition });
      return { then: (resolve) => Promise.resolve().then(resolve), returning: async () => [{ id: "signed-in" }] };
    } }) }),
  };
  const routes = compile(`../app/api/account/${path}/route.ts`, {
    "next/server": { NextResponse: { json: (data, init) => new Response(JSON.stringify(data), init) } },
    "drizzle-orm": { eq: (field, value) => ({ field, value }), ne: (field, value) => ({ not: field, value }), and: (...conditions) => conditions },
    "bcryptjs": bcrypt,
    "@scsms/db/postgres": { db },
    "@scsms/db/postgress-schemas/user": { users: fields },
    "@scsms/db/postgress-schemas/subcounty_ward": { subcounty: fields },
    "@scsms/features/schemas/profile-schema": schemas,
    "@/lib/auth/session": { getAuthenticatedUser: async () => authenticated ? { id: "signed-in", email: "officer@example.com", subcountyId: userSubcountyId } : null },
  });
  return {
    updates,
    async request(body, origin = "http://localhost") {
      const method = path === "profile" ? "PATCH" : "POST";
      const response = await routes[method](new Request(`http://localhost/api/account/${path}`, {
        method, headers: { "Content-Type": "application/json", origin }, body: JSON.stringify(body),
      }));
      return { status: response.status, body: await response.json() };
    },
  };
}

const profile = { name: "Officer", email: "officer@example.com", phone: "", subcountyId: "" };
const passwords = { currentPassword: "OldPassword123", newPassword: "NewPassword456", confirmPassword: "NewPassword456" };

test("both account actions reject unauthenticated and cross-origin requests", async () => {
  for (const path of ["profile", "password"]) {
    const app = harness(path, { authenticated: false });
    assert.equal((await app.request({})).status, 401);
    assert.equal((await app.request({}, "https://another-site.example")).status, 403);
    assert.equal(app.updates.length, 0);
  }
});

test("profile updates target the authenticated ID and ignore injected privileges", async () => {
  const app = harness("profile");
  const response = await app.request({ ...profile, userId: "someone-else", roleId: "administrator", status: "locked" });
  assert.equal(response.status, 200);
  assert.equal(app.updates[0].condition.value, "signed-in");
  assert.equal(app.updates[0].values.roleId, undefined);
  assert.equal(app.updates[0].values.status, undefined);
  assert.equal(app.updates[0].values.email, undefined);
  assert.equal(app.updates[0].values.subcountyId, undefined);
  assert.equal(response.body.profile.email, profile.email);
});

test("email and sub-county changes cannot overwrite the profile", async () => {
  const changedEmail = harness("profile");
  const rejected = await changedEmail.request({ ...profile, email: "different@example.com" });
  assert.equal(rejected.status, 400);
  assert.match(rejected.body.error, /email cannot be changed/);
  assert.equal(changedEmail.updates.length, 0);
  const area = harness("profile", { records: [[], []] });
  const rejectedArea = await area.request({ ...profile, subcountyId: "another-area" });
  assert.equal(rejectedArea.status, 400);
  assert.match(rejectedArea.body.error, /sub-county cannot be changed/);
  assert.equal(area.updates.length, 0);
});

test("an incorrect current password cannot update the stored hash", async () => {
  const passwordHash = await bcrypt.hash(passwords.currentPassword, 4);
  const app = harness("password", { records: [[{ passwordHash }]] });
  assert.equal((await app.request({ ...passwords, currentPassword: "incorrect" })).status, 400);
  assert.equal(app.updates.length, 0);
});

test("an assigned sub-county is preserved and cannot be removed", async () => {
  const app = harness("profile", { userSubcountyId: "area-a" });
  const response = await app.request({ ...profile, subcountyId: "area-a" });
  assert.equal(response.status, 200);
  assert.equal(response.body.profile.subcountyId, "area-a");
  assert.equal(app.updates[0].values.subcountyId, undefined);
  assert.equal((await app.request(profile)).status, 400);
  assert.equal(app.updates.length, 1);
});

test("a verified password change stores a hash usable for the next login", async () => {
  const passwordHash = await bcrypt.hash(passwords.currentPassword, 4);
  const app = harness("password", { records: [[{ passwordHash }]] });
  assert.equal((await app.request(passwords)).status, 200);
  const replacement = app.updates[0].values.passwordHash;
  assert.notEqual(replacement, passwords.newPassword);
  assert.ok(await bcrypt.compare(passwords.newPassword, replacement));
  assert.equal(await bcrypt.compare(passwords.currentPassword, replacement), false);
  assert.equal(app.updates[0].condition[0].value, "signed-in");
});

test("password validation rejects mismatches, reuse, short passwords, and overlong Unicode", () => {
  for (const values of [
    { ...passwords, confirmPassword: "mismatch" },
    { ...passwords, newPassword: passwords.currentPassword, confirmPassword: passwords.currentPassword },
    { ...passwords, newPassword: "short", confirmPassword: "short" },
    { ...passwords, newPassword: "🔒".repeat(4), confirmPassword: "🔒".repeat(4) },
    { ...passwords, newPassword: "🔒".repeat(19), confirmPassword: "🔒".repeat(19) },
  ]) assert.equal(schemas.changePasswordSchema.safeParse(values).success, false);
});

test("Postgres seeding recognises an administrator by role after their email changes", async () => {
  const records = [[{ id: "administrator-role" }], [{ id: "area" }], [{ id: "renamed-user" }]];
  const conditions = [];
  const db = { select: () => ({ from: () => ({ where: (condition) => {
    conditions.push(condition);
    return { limit: async () => records.shift() };
  } }) }) };
  const { seedAdministrator } = compile("../../../database/src/seed/user.seed.ts", {
    "bcryptjs": bcrypt,
    "drizzle-orm": { eq: (field, value) => ({ field, value }), or: (...clauses) => ({ or: clauses }) },
    "../postgres": { db },
    "../postgress-schemas/subcounty_ward": { subcounty: fields },
    "../postgress-schemas/user": { roles: fields, users: fields },
  });
  await seedAdministrator();
  assert.ok(conditions[2].or.some((condition) => condition.field === "roleId" && condition.value === "administrator-role"));
});
