import { readFile, mkdir, open, stat, unlink } from "node:fs/promises";
import { openSync, closeSync } from "node:fs";
import { spawn } from "node:child_process";
import { parseEnv } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const workspace = fileURLToPath(new URL("../", import.meta.url));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ready(base, token) {
  try {
    const health = await fetch(`${base}/health`, { signal: AbortSignal.timeout(1000) });
    if (!health.ok || (await health.json()).status !== "ok") return false;
    // Authenticate without reading or modifying any replicated records.
    const auth = await fetch(`${base}/v1/sync`, {
      method: "POST", headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: "{}", signal: AbortSignal.timeout(1000),
    });
    if (auth.status === 401) throw new Error("The running sync API uses another token. Restart that API with the root .env settings.");
    return auth.status === 400 && (await auth.json()).error === "Invalid sync request";
  } catch (error) {
    if (error.message?.includes("another token")) throw error;
    return false;
  }
}

async function lockAlive(file) {
  try {
    const lock = JSON.parse(await readFile(file, "utf8"));
    if (!Number.isInteger(lock.pid) || lock.pid <= 0) return false;
    try { process.kill(lock.pid, 0); return true; }
    catch (error) { return error.code === "EPERM"; }
  } catch (error) {
    if (error.code === "ENOENT") return false;
    // A competing launcher may still be writing the newly created lock file.
    return Date.now() - (await stat(file)).mtimeMs < 60_000;
  }
}

export async function ensureSyncApi({ rootDir = workspace, inherited = process.env, timeoutMs = 45_000 } = {}) {
  let source = "";
  try { source = await readFile(path.join(rootDir, ".env"), "utf8"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const env = { ...parseEnv(source), ...inherited };
  const port = env.SCSMS_SYNC_PORT ?? "4001";
  const base = (env.SCSMS_SYNC_URL ?? `http://127.0.0.1:${port}`).replace(/\/+$/, "");
  const url = new URL(base);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
    console.log("[sync] Using the configured remote sync API.");
    return { mode: "remote" };
  }
  if (!env.SCSMS_SYNC_TOKEN || env.SCSMS_SYNC_TOKEN.length < 32) {
    throw new Error("Set SCSMS_SYNC_TOKEN to at least 32 random characters in root .env.");
  }
  if (url.port && url.port !== port) throw new Error("Local SCSMS_SYNC_URL must use SCSMS_SYNC_PORT (default 4001).");
  if (await ready(base, env.SCSMS_SYNC_TOKEN)) {
    console.log("[sync] Reusing the running sync API.");
    return { mode: "reused" };
  }
  const directory = path.join(rootDir, ".tmp");
  await mkdir(directory, { recursive: true });
  const lockFile = path.join(directory, "sync-api-start.json");
  const logFile = path.join(directory, "sync-api.log");
  const deadline = Date.now() + timeoutMs;
  let child;
  while (Date.now() < deadline) {
    if (await ready(base, env.SCSMS_SYNC_TOKEN)) {
      console.log(child ? "[sync] Sync API started automatically." : "[sync] Reusing the running sync API.");
      return { mode: child ? "started" : "reused", pid: child?.pid };
    }
    let lock;
    try { lock = await open(lockFile, "wx"); }
    catch (error) {
      if (error.code !== "EEXIST") throw error;
      if (!(await lockAlive(lockFile))) await unlink(lockFile).catch((error) => { if (error.code !== "ENOENT") throw error; });
      await pause(300);
      continue;
    }
    try {
      const log = openSync(logFile, "a");
      try {
        child = spawn(process.execPath, ["src/server.mjs"], {
          cwd: path.join(rootDir, "apps", "sync-api"), env,
          detached: true, windowsHide: true, stdio: ["ignore", log, log],
        });
        await new Promise((resolve, reject) => { child.once("spawn", resolve); child.once("error", reject); });
        await lock.writeFile(JSON.stringify({ pid: child.pid }));
        child.unref();
      } finally { closeSync(log); }
    } catch (error) {
      await unlink(lockFile).catch(() => {});
      throw error;
    } finally { await lock.close(); }
    console.log("[sync] Starting API in the background; logs: .tmp/sync-api.log");
    await pause(300);
    // Keep the lock for the API's lifetime, allowing other launchers to reuse it.
    while (Date.now() < deadline) {
      if (await ready(base, env.SCSMS_SYNC_TOKEN)) {
        console.log("[sync] Sync API started automatically.");
        return { mode: "started", pid: child.pid };
      }
      if (!(await lockAlive(lockFile))) throw new Error("Sync API exited during startup. See .tmp/sync-api.log.");
      await pause(300);
    }
  }
  throw new Error("Sync API startup timed out. See .tmp/sync-api.log; the next app launch will retry if it stopped.");
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  try { await ensureSyncApi(); }
  catch (error) { console.error(`[sync] ${error.message}`); process.exitCode = 1; }
}
