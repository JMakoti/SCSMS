import { spawn } from "node:child_process";
import { ensureSyncApi } from "../../../scripts/ensure-sync.mjs";

if (!process.argv.slice(2).some((arg) => ["--help", "-h"].includes(arg))) {
  try { await ensureSyncApi(); }
  catch (error) { console.error(`[sync] ${error.message}`); }
}
if (!process.env.npm_execpath) throw new Error("Start web development with pnpm.cmd dev:web");
const child = spawn(process.execPath, [process.env.npm_execpath, "exec", "next", "dev", "--port", "3000", ...process.argv.slice(2)], {
  cwd: new URL("../", import.meta.url), stdio: "inherit", env: process.env,
});
child.on("error", () => { console.error("Could not start the web development server."); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
