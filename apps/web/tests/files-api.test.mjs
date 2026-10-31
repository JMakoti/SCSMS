import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function route(path, authenticated = true) {
  const calls = [];
  const exports = {};
  const modules = {
    "node:crypto": { randomUUID: () => "550e8400-e29b-41d4-a716-446655440000" },
    "@/lib/auth/session": { getAuthenticatedUser: async () => authenticated ? { id: "officer" } : null },
    "@scsms/db/storage": {
      fileContentType: (key) => { if (!key.endsWith(".png")) throw new Error("bad key"); return "image/png"; },
      readFileBytes: async () => Buffer.from("fixture"),
      uploadFile: async (key) => { calls.push(key); },
      downloadFile: async () => ({ bytes: Buffer.from("fixture"), contentType: "image/png" }),
    },
  };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), "utf8"), {
    compilerOptions: { target: ts.ScriptTarget.ES2020, module: ts.ModuleKind.CommonJS },
  }).outputText, { exports, require: (name) => { assert.ok(name in modules); return modules[name]; }, Response, Uint8Array, URL, Error });
  return { exports, calls };
}

test("web uploads require a session and same-origin requests", async () => {
  const request = () => new Request("http://localhost/api/files", { method: "POST", headers: { "x-file-extension": "png" }, body: "fixture" });
  assert.equal((await route("../app/api/files/route.ts", false).exports.POST(request())).status, 401);
  const api = route("../app/api/files/route.ts");
  assert.equal((await api.exports.POST(new Request("http://localhost/api/files", { method: "POST", headers: { origin: "http://other.example", "x-file-extension": "png" }, body: "fixture" }))).status, 403);
  const response = await api.exports.POST(request());
  assert.equal(response.status, 200);
  assert.equal(api.calls.length, 1);
  assert.equal((await response.json()).key, "school-logos/550e8400-e29b-41d4-a716-446655440000.png");
});

test("web private downloads require a session and return bounded image responses", async () => {
  const context = { params: Promise.resolve({ path: ["school-logos", "fixture.png"] }) };
  const request = new Request("http://localhost/api/files/school-logos/fixture.png");
  assert.equal((await route("../app/api/files/[...path]/route.ts", false).exports.GET(request, context)).status, 401);
  const response = await route("../app/api/files/[...path]/route.ts").exports.GET(request, context);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-security-policy"), "default-src 'none'; sandbox");
  assert.equal(await response.text(), "fixture");
});
