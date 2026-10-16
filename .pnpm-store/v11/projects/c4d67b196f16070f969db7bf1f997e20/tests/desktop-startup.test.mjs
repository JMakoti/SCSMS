import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function compile(path, modules, globals = {}) {
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: (id) => {
      assert.ok(id in modules, `Unexpected import: ${id}`);
      return modules[id];
    },
    ...globals,
  });
  return exports;
}

test("desktop login lasts only until the shell is closed", () => {
  const path = "../app/(dashboard)/dashboard-shell.tsx";
  const source = fs.readFileSync(new URL(path, import.meta.url), "utf8");
  let removed = 0;
  let reads = 0;
  let writes = 0;
  const storage = {
    getItem(key) { if (key === "scsms-session-user") reads++; return null; },
    setItem() { writes++; },
    removeItem(key) { assert.equal(key, "scsms-session-user"); removed++; },
  };
  const session = compile("../app/session-user.ts", {}, { localStorage: storage });
  function openApp() {
    const slots = [];
    let cursor = 0;
    const effects = [];
    const modules = Object.fromEntries([...source.matchAll(/from "([^"]+)"/g)].map((m) => [m[1], {}]));
    modules.react = {
      useState(initial) {
        const i = cursor++;
        if (!(i in slots)) slots[i] = initial;
        return [slots[i], (value) => { slots[i] = value; }];
      },
      useSyncExternalStore: () => true,
      useEffect(callback) { effects.push(callback); },
    };
    const jsx = (type, props) => ({ type, props });
    modules["react/jsx-runtime"] = { jsx, jsxs: jsx, Fragment: "fragment" };
    modules["next/navigation"] = { useRouter: () => ({}), usePathname: () => "/" };
    modules["../session-user"] = session;
    modules["@/repository/auth"] = { logoutLocalAccount: async () => {} };
    modules["./feature-data-boundary"] = { FeatureDataBoundary: "dashboard" };
    modules["@scsms/features/navigation/topbar"] = { default: "topbar" };
    modules["@scsms/features/auth/login-page"] = { LoginPage: "login" };
    const { DashboardShell } = compile(path, modules, {
      localStorage: storage,
      window: { addEventListener() {}, removeEventListener() {} },
    });
    return () => {
      cursor = 0;
      const tree = DashboardShell({ children: "page" });
      effects.splice(0).forEach((effect) => effect());
      return tree;
    };
  }
  const render = openApp();
  let tree = render();
  assert.equal(tree.props.children[0].type, "login");
  tree.props.children[0].props.onLogin({ email: "admin@example.com" });
  tree = render();
  assert.equal(tree.type, "dashboard");
  assert.equal(render().type, "dashboard");
  assert.equal(openApp()().props.children[0].type, "login");
  function findTopbar(node) {
    if (!node || typeof node !== "object") return null;
    if (node.type === "topbar") return node;
    for (const child of [].concat(node.props?.children ?? [])) {
      const result = findTopbar(child);
      if (result) return result;
    }
    return null;
  }
  findTopbar(tree).props.onLogout();
  assert.equal(render().props.children[0].type, "login");
  assert.equal(reads, 0);
  assert.equal(writes, 0);
  assert.ok(removed > 0);
});

test("browser sign-in never invokes the native login command", async () => {
  let calls = 0;
  const auth = compile("../repository/auth.ts", {
    "@tauri-apps/api/core": {
      isTauri: () => false,
      invoke: () => { calls++; },
    },
  }, { Error });
  await assert.rejects(auth.loginWithLocalAccount({}), /Open the desktop application/);
  assert.equal(calls, 0);
});

function boundaryHarness(loader) {
  const slots = [];
  const cleanups = [];
  const timers = new Map();
  const listeners = new Map();
  let cursor = 0;
  let timerId = 0;
  let effects = [];
  const jsx = (type, props) => ({ type, props });
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => {
        slots[index] = typeof next === "function" ? next(slots[index]) : next;
      }];
    },
    useEffect(callback, deps) {
      const index = cursor++;
      if (!slots[index] || deps.some((dep, i) => dep !== slots[index][i])) {
        cleanups[index]?.();
        slots[index] = deps;
        effects.push(() => { cleanups[index] = callback(); });
      }
    },
  };
  const { FeatureDataBoundary } = compile("../app/(dashboard)/feature-data-boundary.tsx", {
    react,
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "next/navigation": { usePathname: () => "/" },
    "@scsms/features/academic-years/academic-year-context": { AcademicYearProvider: "years" },
    "@scsms/features/data/feature-data-context": { FeatureDataProvider: "records" },
    "@/lib/feature-data": { loadDesktopFeatureData: loader },
  }, {
    console: { error: () => {} },
    setTimeout: (callback, delay) => { timers.set(++timerId, { callback, delay }); return timerId; },
    clearTimeout: (id) => timers.delete(id),
    window: {
      addEventListener: (name, callback) => listeners.set(name, callback),
      removeEventListener: (name) => listeners.delete(name),
    },
  });
  const props = { userEmail: "admin@example.com", children: "dashboard" };
  return {
    timers,
    render() {
      cursor = 0;
      const tree = FeatureDataBoundary(props);
      const pending = effects;
      effects = [];
      pending.forEach((effect) => effect());
      return tree;
    },
    retry() {
      const [id, timer] = timers.entries().next().value;
      timers.delete(id);
      timer.callback();
    },
    refresh() { listeners.get("scsms:academic-years-refresh")(); },
    unmount() { cleanups.forEach((cleanup) => cleanup?.()); },
  };
}

const flush = () => new Promise((resolve) => setImmediate(resolve));
const data = { academicYears: [{ id: "year-2026", isActive: true }] };

test("startup retries a temporary database failure and supplies persisted academic years", async () => {
  let calls = 0;
  const app = boundaryHarness(async () => {
    if (++calls === 1) throw new Error("Failed query: select academic_years");
    return data;
  });
  app.render();
  await flush();
  const pending = app.render();
  assert.equal(pending.type, "main");
  assert.equal(pending.props.className, "content");
  assert.doesNotMatch(JSON.stringify(pending), /login-card|Back to sign in/);
  assert.doesNotMatch(JSON.stringify(pending), /Failed query/);
  assert.equal(app.timers.size, 1);
  app.retry();
  await flush();
  const loaded = app.render();
  assert.equal(loaded.type, "records");
  assert.equal(loaded.props.children.props.initialAcademicYears, data.academicYears);
  assert.equal(app.timers.size, 0);
  app.unmount();
});

test("a failed refresh keeps the dashboard mounted and logout cancels retries", async () => {
  let calls = 0;
  const app = boundaryHarness(async () => {
    if (++calls > 1) throw new Error("Database temporarily unavailable");
    return data;
  });
  app.render();
  await flush();
  app.refresh();
  app.render();
  await flush();
  const tree = app.render();
  assert.equal(tree.type, "records");
  assert.equal(tree.props.children.props.children[1], "dashboard");
  assert.equal(app.timers.size, 1);
  app.unmount();
  assert.equal(app.timers.size, 0);
});

test("a request completing after logout cannot schedule a retry", async () => {
  let reject;
  const app = boundaryHarness(() => new Promise((_, fail) => { reject = fail; }));
  app.render();
  app.unmount();
  reject(new Error("Database unavailable"));
  await flush();
  assert.equal(app.timers.size, 0);
});
