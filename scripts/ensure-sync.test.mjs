import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { ensureSyncApi } from "./ensure-sync.mjs";

test("concurrent app launches recover a stale lock and start only one background API", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "scsms-autosync-"));
  let pid;
  try {
    const reservation = createServer();
    reservation.listen(0, "127.0.0.1");
    await once(reservation, "listening");
    const port = reservation.address().port;
    await new Promise((resolve) => reservation.close(resolve));
    await mkdir(path.join(root, "apps", "sync-api", "src"), { recursive: true });
    await mkdir(path.join(root, ".tmp"));
    await writeFile(path.join(root, ".tmp", "sync-api-start.json"), JSON.stringify({ pid: 2147483647 }));
    await writeFile(path.join(root, "apps", "sync-api", "src", "server.mjs"), `
      import { createServer } from 'node:http';
      console.log('fixture-started');
      createServer((req,res)=>{
        res.setHeader('content-type','application/json');
        if(req.url==='/health') { res.end(JSON.stringify({status:'ok'})); return; }
        res.statusCode=req.headers.authorization==='Bearer '+process.env.SCSMS_SYNC_TOKEN?400:401;
        res.end(JSON.stringify({error:res.statusCode===400?'Invalid sync request':'Unauthorized'}));
      }).listen(Number(process.env.SCSMS_SYNC_PORT),'127.0.0.1');
    `);
    const options = { rootDir: root, inherited: { ...process.env, SCSMS_SYNC_TOKEN: "fixture-token-123456789012345678901234567890", SCSMS_SYNC_PORT: String(port), SCSMS_SYNC_URL: `http://127.0.0.1:${port}/` }, timeoutMs: 10_000 };
    const results = await Promise.all([ensureSyncApi(options), ensureSyncApi(options)]);
    pid = JSON.parse(await readFile(path.join(root, ".tmp", "sync-api-start.json"), "utf8")).pid;
    assert.equal(results.filter((r) => r.mode === "started").length, 1);
    assert.equal(results.filter((r) => r.mode === "reused").length, 1);
    assert.equal((await ensureSyncApi(options)).mode, "reused");
    assert.equal((await readFile(path.join(root, ".tmp", "sync-api.log"), "utf8")).split("fixture-started").length - 1, 1);
    await assert.rejects(ensureSyncApi({ ...options, inherited: { ...options.inherited, SCSMS_SYNC_TOKEN: "another-token-123456789012345678901234567890" } }), /another token/);
  } finally {
    if (!pid) {
      try { pid = JSON.parse(await readFile(path.join(root, ".tmp", "sync-api-start.json"), "utf8")).pid; } catch {}
    }
    if (pid && pid !== 2147483647) { try { process.kill(pid); } catch {} }
    assert.equal(path.dirname(root), path.resolve(tmpdir()));
    assert.ok(path.basename(root).startsWith("scsms-autosync-"));
    await rm(root, { recursive: true, force: true, maxRetries: 10, retryDelay: 100 });
  }
});
