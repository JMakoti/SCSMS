import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

// Exercise the desktop adapter without downloading or launching a real installer.
const source = fs.readFileSync(new URL("../components/desktop-updater-provider.tsx", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;

function harness({ native = true, saved = {}, update = null, checkImpl } = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let value;
  let stored = JSON.stringify(saved);
  let checks = 0;
  const dependenciesChanged = (a, b) => !a || a.some((item, index) => item !== b[index]);
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      return slots[index] ??= { current: initial };
    },
    useCallback(callback, deps) {
      const index = cursor++;
      if (dependenciesChanged(slots[index]?.deps, deps)) slots[index] = { callback, deps };
      return slots[index].callback;
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (dependenciesChanged(slots[index], deps)) { slots[index] = deps; effects.push(callback); }
    },
  };
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (_, props) => { value = props.value; return props; } },
    "@tauri-apps/api/app": { getVersion: async () => "1.0.0" },
    "@tauri-apps/api/core": { isTauri: () => native },
    "@tauri-apps/plugin-updater": { check: async () => { checks++; return checkImpl ? checkImpl() : update; } },
    "@tauri-apps/plugin-process": { relaunch: async () => {} },
    "@scsms/features/updates/update-context": { UpdateContext: { Provider: "provider" } },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: (name) => { assert.ok(modules[name], name); return modules[name]; },
    localStorage: { getItem: () => stored, setItem: (_, next) => { stored = next; } },
    window: { setInterval: () => 1, clearInterval: () => {} },
  });
  const render = () => { cursor = 0; exports.DesktopUpdaterProvider({ children: null }); return value; };
  const flush = async () => {
    for (let i = 0; i < 4; i++) {
      render();
      const pending = effects; effects = [];
      pending.forEach((effect) => effect());
      await new Promise((resolve) => setImmediate(resolve));
    }
    return render();
  };
  return { render, flush, saved: () => JSON.parse(stored), checks: () => checks };
}

test("browser previews do not invoke the native updater", async () => {
  const app = harness({ native: false });
  const state = await app.flush();
  await state.check();
  assert.equal(state.supported, false);
  assert.equal(app.checks(), 0);
});

test("a successful empty check records a real timestamp and current status", async () => {
  const app = harness();
  await (await app.flush()).check();
  const state = app.render();
  assert.equal(state.status, "current");
  assert.equal(state.currentVersion, "1.0.0");
  assert.ok(Number.isFinite(Date.parse(state.lastChecked)));
});

test("failed checks report errors without inventing a successful check", async () => {
  const app = harness({ checkImpl: () => { throw new Error("Server unavailable"); } });
  await (await app.flush()).check();
  const state = app.render();
  assert.equal(state.status, "error");
  assert.match(state.error, /Server unavailable/);
  assert.equal(state.lastChecked, "");
});

test("available updates expose notes; downloads report progress and failed installs remain retryable", async () => {
  const app = harness({ update: {
    version: "1.1.0", body: "Fixes", date: "2026-10-14T00:00:00Z",
    download: async (event) => { event({ event: "Started", data: { contentLength: 100 } }); event({ event: "Progress", data: { chunkLength: 50 } }); },
    install: async () => { throw new Error("Installer failed"); }, close: async () => {},
  } });
  await (await app.flush()).check();
  let state = app.render();
  assert.equal(state.status, "available");
  assert.equal(state.availableVersion, "1.1.0");
  assert.equal(state.releaseNotes, "Fixes");
  await state.install();
  state = app.render();
  assert.equal(state.downloadedBytes, 50);
  assert.equal(state.totalBytes, 100);
  assert.equal(state.status, "error");
  assert.equal(app.saved().pendingVersion, "");
  assert.equal(app.saved().history.length, 0);
});

test("installation history is confirmed by the running version on next launch", async () => {
  const confirmed = harness({ saved: { pendingVersion: "1.0.0" } });
  await confirmed.flush();
  assert.equal(confirmed.saved().history[0].version, "1.0.0");
  assert.equal(confirmed.saved().pendingVersion, "");
  const unconfirmed = harness({ saved: { pendingVersion: "1.1.0" } });
  await unconfirmed.flush();
  assert.equal(unconfirmed.saved().history.length, 0);
});

test("pausing automatic checks persists and still allows manual checks", async () => {
  const app = harness({ saved: { automaticChecks: true, pauseUntil: "2999-01-01" } });
  const state = await app.flush();
  assert.equal(app.checks(), 0);
  await state.check();
  assert.equal(app.checks(), 1);
  state.setAutomaticChecks(false);
  state.setPauseUntil("");
  assert.equal(app.saved().automaticChecks, false);
  assert.equal(app.saved().pauseUntil, "");
});

test("concurrent clicks produce only one native check", async () => {
  let complete;
  const app = harness({ checkImpl: () => new Promise((resolve) => { complete = resolve; }) });
  const state = await app.flush();
  const first = state.check();
  await state.check();
  assert.equal(app.checks(), 1);
  complete(null);
  await first;
});
