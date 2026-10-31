import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)), quiet: true });
const url = new URL(process.env.DATABASE_URL);
if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)) {
  throw new Error("test:local only creates a disposable database on local PostgreSQL");
}
const admin = postgres(url.toString(), { max: 1, connect_timeout: 5 });
const name = `scsms_sync_test_${randomUUID().replaceAll("-", "")}`;
let created = false;
try {
  await admin`CREATE DATABASE ${admin(name)}`;
  created = true;
  url.pathname = `/${name}`;
  const result = spawnSync(process.execPath, ["--test", "tests/postgres.test.mjs"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, SCSMS_SYNC_TEST_DATABASE_URL: url.toString() },
    stdio: "inherit",
  });
  process.exitCode = result.status ?? 1;
} finally {
  if (created) await admin`DROP DATABASE ${admin(name)} WITH (FORCE)`;
  await admin.end();
}
