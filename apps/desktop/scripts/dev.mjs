import { readFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import { desktopDevEnv } from "./dev-env.mjs";
import { ensureSyncApi } from "../../../scripts/ensure-sync.mjs";

let source = "";
try { source = await readFile(new URL("../../../.env", import.meta.url), "utf8"); }
catch (error) { if (error.code !== "ENOENT") throw error; }

if (!process.env.npm_execpath) throw new Error("Start desktop development with pnpm.cmd dev:desktop");
if (!process.argv.slice(2).some((arg) => ["--help", "-h"].includes(arg))) {
  try { await ensureSyncApi(); }
  catch (error) { console.error(`[sync] ${error.message} Desktop changes will stay queued offline.`); }
}
const child = spawn(process.execPath, [process.env.npm_execpath, "exec", "tauri", "dev", ...process.argv.slice(2)], {
  cwd: new URL("../", import.meta.url),
  env: desktopDevEnv(source),
  stdio: "inherit",
});
child.on("error", () => { console.error("Could not start Tauri development."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
