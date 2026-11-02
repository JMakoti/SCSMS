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

function harness({ native = true, saved = { preferencesVersion: 1, automaticChecks: false }, update = null, checkImpl, online = true } = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let value;
  let stored = JSON.stringify(saved);
  let checks = 0;
  let restarts = 0;
  let now = Date.now();
  const intervals = new Map();
  const listeners = new Map();
  const navigator = { onLine: online };
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
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
      if (dependenciesChanged(slots[index]?.deps, deps)) {
        const previous = slots[index];
        slots[index] = { deps };
        effects.push(() => { previous?.cleanup?.(); slots[index].cleanup = callback(); });
      }
    },
  };
  const modules = {
    react,
    "react/jsx-runtime": { jsx: (_, props) => { value = props.value; return props; } },
    "@tauri-apps/api/app": { getVersion: async () => "1.0.0" },
    "@tauri-apps/api/core": { isTauri: () => native },
    "@tauri-apps/plugin-updater": { check: async () => { checks++; return checkImpl ? checkImpl() : update; } },
    "@tauri-apps/plugin-process": { relaunch: async () => { restarts++; } },
    "@scsms/features/updates/update-context": { UpdateContext: { Provider: "provider" } },
  };
  const exports = {};
  vm.runInNewContext(compiled, {
    exports, require: (name) => { assert.ok(modules[name], name); return modules[name]; },
    localStorage: { getItem: () => stored, setItem: (_, next) => { stored = next; } },
    Date: TestDate, navigator,
    window: {
      setInterval: (callback) => { const id = Symbol(); intervals.set(id, callback); return id; },
      clearInterval: (id) => intervals.delete(id),
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    },
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
  return {
    render, flush, saved: () => JSON.parse(stored), checks: () => checks, restarts: () => restarts,
    async tick(milliseconds) { now += milliseconds; intervals.forEach((callback) => callback()); return flush(); },
    async reconnect() { navigator.onLine = true; listeners.get("online")?.(); return flush(); },
  };
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

test("new installations automatically check, download, install, and restart without a click", async () => {
  let downloads = 0;
  let installs = 0;
  const app = harness({ saved: {}, update: {
    version: "1.1.0",
    download: async () => { downloads++; },
    install: async (options) => { assert.equal(options.restartAfterInstall, true); installs++; },
    close: async () => {},
  } });
  const state = await app.flush();
  assert.equal(app.checks(), 1);
  assert.equal(downloads, 1);
  assert.equal(installs, 1);
  assert.equal(app.restarts(), 1);
  assert.equal(state.status, "installed");
  assert.equal(app.saved().pendingVersion, "1.1.0");
  assert.equal(app.saved().history.length, 0);
  await app.tick(2 * 60 * 60 * 1000);
  assert.equal(app.checks(), 1);
});

test("old opt-in defaults migrate to automatic updates but a new opt-out persists", async () => {
  const app = harness({ saved: { automaticChecks: false } });
  let state = await app.flush();
  assert.equal(state.automaticChecks, true);
  assert.equal(app.checks(), 1);
  state.setAutomaticChecks(false);
  await app.flush();
  const reloaded = harness({ saved: app.saved() });
  state = await reloaded.flush();
  assert.equal(state.automaticChecks, false);
  assert.equal(reloaded.checks(), 0);
});

test("startup checks ignore yesterday's schedule and repeat hourly", async () => {
  const app = harness({ saved: { automaticChecks: true, lastChecked: new Date().toISOString() } });
  await app.flush();
  assert.equal(app.checks(), 1);
  await app.tick(59 * 60 * 1000);
  assert.equal(app.checks(), 1);
  await app.tick(60 * 1000);
  assert.equal(app.checks(), 2);
});

test("offline startup waits for connectivity then checks immediately", async () => {
  const app = harness({ saved: {}, online: false });
  await app.flush();
  assert.equal(app.checks(), 0);
  await app.reconnect();
  assert.equal(app.checks(), 1);
});

test("failed automatic checks retry after five minutes", async () => {
  let fails = true;
  const app = harness({ saved: {}, checkImpl: () => {
    if (fails) throw new Error("Offline");
    return null;
  } });
  assert.equal((await app.flush()).status, "error");
  fails = false;
  await app.tick(4 * 60 * 1000);
  assert.equal(app.checks(), 1);
  assert.equal((await app.tick(60 * 1000)).status, "current");
  assert.equal(app.checks(), 2);
});

test("a failed automatic download retries and installs without manual intervention", async () => {
  let downloads = 0;
  let installs = 0;
  const app = harness({ saved: {}, update: {
    version: "1.1.0",
    download: async () => { if (++downloads === 1) throw new Error("Connection lost"); },
    install: async () => { installs++; },
    close: async () => {},
  } });
  assert.equal((await app.flush()).status, "error");
  assert.equal(installs, 0);
  assert.equal((await app.tick(5 * 60 * 1000)).status, "installed");
  assert.equal(downloads, 2);
  assert.equal(installs, 1);
});

test("manual actions cannot start a second download during automatic installation", async () => {
  let complete;
  let downloads = 0;
  const app = harness({ saved: {}, update: {
    version: "1.1.0",
    download: () => { downloads++; return new Promise((resolve) => { complete = resolve; }); },
    install: async () => {}, close: async () => {},
  } });
  const state = await app.flush();
  assert.equal(state.status, "downloading");
  await state.check();
  await state.install();
  await app.tick(60 * 60 * 1000);
  assert.equal(app.checks(), 1);
  assert.equal(downloads, 1);
  complete();
  assert.equal((await app.flush()).status, "installed");
});

test("pausing prevents automatic downloads and resuming installs an available release", async () => {
  let installs = 0;
  const app = harness({ saved: { automaticChecks: true, pauseUntil: "2999-01-01" }, update: {
    version: "1.1.0", download: async () => {},
    install: async () => { installs++; }, close: async () => {},
  } });
  let state = await app.flush();
  assert.equal(app.checks(), 0);
  await state.check();
  state = app.render();
  assert.equal(state.status, "available");
  assert.equal(installs, 0);
  state.setPauseUntil("");
  assert.equal((await app.flush()).status, "installed");
  assert.equal(installs, 1);
});
