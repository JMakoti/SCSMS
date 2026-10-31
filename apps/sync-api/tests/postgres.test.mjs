import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile, readdir } from "node:fs/promises";
import postgres from "postgres";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { createServer as createHttpServer } from "node:http";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { initialize, exchange } from "../src/sync.mjs";

test("PostgreSQL replication: seed aliases, retries, web edits, deletes, atomicity", {
  skip: !process.env.SCSMS_SYNC_TEST_DATABASE_URL,
}, async () => {
  const sql = postgres(process.env.SCSMS_SYNC_TEST_DATABASE_URL, { max: 5, onnotice: () => {} });
  let created = false;
  try {
    const existing = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
    assert.equal(existing.length, 0, "Integration test requires an empty disposable database");
    created = true;
    const dir = new URL("../../../database/drizzle/postgres/", import.meta.url);
    for (const name of (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort()) {
      // The existing 0005 and 0006 files both add cluster_level.
      const migration = (await readFile(new URL(name, dir), "utf8")).replace('ADD COLUMN "cluster_level"', 'ADD COLUMN IF NOT EXISTS "cluster_level"');
      await sql.unsafe(migration);
    }
    await sql`INSERT INTO roles (id,name,permissions_json) VALUES ('cloud-role','administrator','["*"]')`;
    await sql`INSERT INTO subcounty (id,county,county_code,sub_county,sub_county_code) VALUES ('cloud-area','Kilifi','003','Rabai','00301')`;
    const meta = await initialize(sql);
    const request = (changes = [], cursor = "0") => ({ deviceId: "desktop-a", cursor, changes });
    const event = (id, table, row, operation = "insert") => ({ id, table, recordId: row.id, operation, row });
    const roles = await sql`SELECT to_jsonb(r) AS row FROM roles r WHERE id='cloud-role'`;
    const areas = await sql`SELECT to_jsonb(r) AS row FROM subcounty r WHERE id='cloud-area'`;
    const first = await exchange(sql, meta, request([
      event("seed-role", "roles", { ...roles[0].row, id: "local-role", permissions_json: "[]" }),
      event("seed-area", "subcounty", { ...areas[0].row, id: "local-area" }),
      event("seed-user", "users", { id: "local-user", role_id: "local-role", subcounty_id: "local-area", name: "Officer", email: "test@example.org", password_hash: "not-a-real-hash", status: "active" }),
    ]));
    assert.deepEqual(first.acknowledged, ["seed-role", "seed-area", "seed-user"]);
    assert.ok(first.changes.some((c) => c.table === "roles" && c.recordId === "local-role"));
    const [user] = await sql`SELECT role_id, subcounty_id FROM users WHERE id='local-user'`;
    assert.equal(user.role_id, "cloud-role");
    assert.equal(user.subcounty_id, "cloud-area");
    assert.equal((await sql`SELECT permissions_json FROM roles WHERE id='cloud-role'`)[0].permissions_json, '["*"]');
    await exchange(sql, meta, request([
      event("seed-ward", "wards", { id: "local-ward", sub_county_id: "local-area", ward_name: "Test ward", ward_code: "test-ward-code" }),
      event("school-with-logo", "schools", { id: "local-school", school_code: "test-school", uic_code: "test-uic", official_name: "Test school", display_name: "Test school", institution_type: "regular", level: "primary", ownership_type: "goverment", ward_id: "local-ward", logo_path: "school-logos/device-only.png", logo_object_key: "school-logos/550e8400-e29b-41d4-a716-446655440000.png" }),
    ]));
    assert.equal((await sql`SELECT display_name FROM schools WHERE id='local-school'`)[0].display_name, "Test school");
    const schoolDownload = (await exchange(sql, meta, request())).changes.find((c) => c.table === "schools");
    assert.equal(schoolDownload.row.logo_path, undefined, "Device-only file paths must not be downloaded to other devices");
    assert.equal(schoolDownload.row.logo_object_key, "school-logos/550e8400-e29b-41d4-a716-446655440000.png");
    await assert.rejects(() => exchange(sql, meta, request([
      event("unknown-school-field", "schools", { id: "local-school", unrecognized_column: "value" }, "update"),
    ])), /Unknown column schools.unrecognized_column/);
    const logCount = (await sql`SELECT count(*)::int AS n FROM __sync_log`)[0].n;
    await exchange(sql, meta, request([event("seed-user", "users", { id: "local-user" })]));
    assert.equal((await sql`SELECT count(*)::int AS n FROM __sync_log`)[0].n, logCount, "Retry must not replay a write");
    await sql`UPDATE users SET name='Web edit' WHERE id='local-user'`;
    const pull = await exchange(sql, meta, request([], first.cursor));
    assert.equal(pull.changes.at(-1).row.name, "Web edit");
    await exchange(sql, meta, request([event("offline-edit", "users", { id: "local-user", role_id: "local-role", subcounty_id: "local-area", name: "Offline edit", email: "test@example.org", password_hash: "not-a-real-hash", status: "active" }, "update")], pull.cursor));
    assert.equal((await sql`SELECT name FROM users WHERE id='local-user'`)[0].name, "Offline edit");
    await assert.rejects(() => exchange(sql, meta, request([
      event("atomic-good", "academic_years", { id: "year-good", name: "2026", starts_on: "2026-01-01", ends_on: "2026-12-31" }),
      event("atomic-bad", "terms", { id: "bad-term", academic_year_id: "missing-parent", name: "Term 1", sequence: 1 }),
    ])));
    assert.equal((await sql`SELECT id FROM academic_years WHERE id='year-good'`).length, 0);
    await sql`DELETE FROM users WHERE id='local-user'`;
    const deletion = await exchange(sql, meta, request([], pull.cursor));
    assert.ok(deletion.changes.some((c) => c.operation === "delete" && c.recordId === "local-user"));
    // Reinitialization preserves history and cursor ordering.
    const before = (await sql`SELECT revision::text FROM __sync_clock`)[0].revision;
    await initialize(sql);
    assert.equal((await sql`SELECT revision::text FROM __sync_clock`)[0].revision, before);
    await assert.rejects(() => exchange(sql, meta, request([], "999999999999999999")), /ahead/);

    const years = Array.from({ length: 510 }, (_, i) => ({ id: `page-year-${i}`, name: `Page year ${i}`, starts_on: "2026-01-01", ends_on: "2026-12-31" }));
    await sql`INSERT INTO academic_years ${sql(years, "id", "name", "starts_on", "ends_on")}`;
    const page1 = await exchange(sql, meta, request([], before));
    assert.equal(page1.changes.length, 500);
    assert.equal(page1.hasMore, true);
    const page2 = await exchange(sql, meta, request([], page1.cursor));
    assert.equal(page2.changes.length, 10);
    assert.equal(page2.hasMore, false);
    assert.equal((await exchange(sql, meta, request([], page2.cursor))).changes.length, 0);

    // A later revision cannot become visible before an earlier transaction commits.
    let inserted;
    let release;
    const ready = new Promise((resolve) => { inserted = resolve; });
    const gate = new Promise((resolve) => { release = resolve; });
    const firstWriter = sql.begin(async (tx) => {
      await tx`UPDATE academic_years SET status='closed' WHERE id='page-year-0'`;
      inserted();
      await gate;
    });
    await ready;
    const secondWriter = sql.begin(async (tx) => {
      await tx`UPDATE academic_years SET status='closed' WHERE id='page-year-1'`;
    });
    try {
      const during = await exchange(sql, meta, request([], page2.cursor));
      assert.equal(during.changes.length, 0);
    } finally { release(); }
    await Promise.all([firstWriter, secondWriter]);
    assert.equal((await exchange(sql, meta, request([], page2.cursor))).changes.length, 2);

    // Exercise the actual HTTP process with an isolated database and fake device token.
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    const token = "integration-test-device-secret-123456789";
    const objects = new Map();
    const storage = createHttpServer(async (req, res) => {
      if (req.headers.authorization !== "Bearer fixture-storage-key") { res.writeHead(401); res.end(); return; }
      if (req.url === "/storage/v1/bucket/scsms") { res.end("{}"); return; }
      const object = req.url.replace("/storage/v1/object/authenticated/scsms/", "").replace("/storage/v1/object/scsms/", "");
      if (req.method === "POST") {
        const chunks = []; for await (const chunk of req) chunks.push(chunk);
        objects.set(object, Buffer.concat(chunks)); res.end("{}");
      } else { res.end(objects.get(object)); }
    });
    storage.listen(0, "127.0.0.1"); await once(storage, "listening");
    const child = spawn(process.execPath, ["src/server.mjs"], {
      cwd: fileURLToPath(new URL("../", import.meta.url)),
      env: { ...process.env, DATABASE_URL: process.env.SCSMS_SYNC_TEST_DATABASE_URL, SCSMS_SYNC_TOKEN: token, SCSMS_SYNC_PORT: String(port), SCSMS_SYNC_HOST: "127.0.0.1", SUPABASE_URL: `http://127.0.0.1:${storage.address().port}`, SUPABASE_SERVICE_ROLE_KEY: "fixture-storage-key", SUPABASE_STORAGE_BUCKET: "scsms" },
      stdio: ["ignore", "pipe", "pipe"],
    });
    try {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Sync API startup timed out")), 15_000);
        child.once("error", (error) => { clearTimeout(timer); reject(error); });
        child.once("exit", (code) => { clearTimeout(timer); reject(new Error(`Sync API exited early: ${code}`)); });
        child.stdout.on("data", (chunk) => {
          if (chunk.toString().includes("SCSMS sync API ready")) { clearTimeout(timer); resolve(); }
        });
      });
      const base = `http://127.0.0.1:${port}`;
      assert.equal((await fetch(`${base}/health`)).status, 200);
      assert.equal((await fetch(`${base}/v1/sync`, { method: "POST", body: JSON.stringify(request()) })).status, 401);
      assert.equal((await fetch(`${base}/v1/sync`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: "{}" })).status, 400);
      const response = await fetch(`${base}/v1/sync`, { method: "POST", headers: { Authorization: `Bearer ${token}` }, body: JSON.stringify(request()) });
      assert.equal(response.status, 200);
      assert.ok(Array.isArray((await response.json()).changes));
      const objectKey = "school-logos/550e8400-e29b-41d4-a716-446655440000.png";
      assert.equal((await fetch(`${base}/v1/files/${objectKey}`, { method: "PUT", body: "fixture-image" })).status, 401);
      assert.equal((await fetch(`${base}/v1/files/not-a-logo.exe`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: "fixture-image" })).status, 400);
      const uploaded = await fetch(`${base}/v1/files/${objectKey}`, { method: "PUT", headers: { Authorization: `Bearer ${token}` }, body: "fixture-image" });
      assert.equal(uploaded.status, 200);
      assert.equal((await uploaded.json()).key, objectKey);
      const downloaded = await fetch(`${base}/v1/files/${objectKey}`, { headers: { Authorization: `Bearer ${token}` } });
      assert.equal(downloaded.status, 200);
      assert.equal(downloaded.headers.get("content-type"), "image/png");
      assert.equal(await downloaded.text(), "fixture-image");
    } finally {
      const stopped = once(child, "exit");
      child.kill();
      await stopped;
      await new Promise((resolve) => storage.close(resolve));
    }
  } finally {
    if (created) {
      const tables = await sql`SELECT tablename FROM pg_tables WHERE schemaname='public'`;
      for (const row of tables) await sql`DROP TABLE ${sql(row.tablename)} CASCADE`;
      await sql`DROP FUNCTION IF EXISTS public.__sync_capture() CASCADE`;
      await sql`DROP FUNCTION IF EXISTS public.__sync_lock() CASCADE`;
    }
    await sql.end();
  }
});
