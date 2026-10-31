import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const exports = {};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../lib/auth/read-response.ts", import.meta.url), "utf8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
}).outputText, { exports, Error });
const { readAuthResponse } = exports;

test("missing or HTML login responses provide an actionable error instead of a JSON syntax error", async () => {
  await assert.rejects(readAuthResponse(new Response("<!DOCTYPE html><html></html>", { status: 404, headers: { "Content-Type": "text/html" } })), /pnpm dev:web/);
  await assert.rejects(readAuthResponse(new Response("<!DOCTYPE html><html></html>", { status: 500, headers: { "Content-Type": "text/html" } })), /unexpected response/);
  await assert.rejects(readAuthResponse(new Response("{broken", { headers: { "Content-Type": "application/json" } })), /invalid response/);
});

test("valid success and rejected credentials retain their JSON payload", async () => {
  const success = await readAuthResponse(Response.json({ user: { email: "test@example.org" } }));
  assert.equal(success.user.email, "test@example.org");
  const rejected = await readAuthResponse(Response.json({ error: "Email or password is incorrect." }, { status: 401 }));
  assert.equal(rejected.error, "Email or password is incorrect.");
});
