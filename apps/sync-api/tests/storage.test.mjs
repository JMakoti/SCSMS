import { test } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import {
  uploadFile,
  downloadFile,
  fileContentType,
  storageConfig,
  readFileBytes,
  MAX_FILE_BYTES,
} from "../../../database/storage/client.mjs";

test("private bucket creation, upload and authenticated download use scsms with server credentials", async () => {
  const objects = new Map();
  const bucketRequests = [];
  const server = createServer(async (req, res) => {
    assert.equal(req.headers.apikey, "fixture-service-key");
    assert.equal(req.headers.authorization, "Bearer fixture-service-key");
    if (req.url === "/storage/v1/bucket/scsms") {
      res.writeHead(404);
      res.end();
      return;
    }
    if (req.url === "/storage/v1/bucket") {
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      bucketRequests.push(JSON.parse(Buffer.concat(chunks)));
      res.writeHead(200);
      res.end("{}");
      return;
    }
    const key = req.url
      .replace("/storage/v1/object/authenticated/scsms/", "")
      .replace("/storage/v1/object/scsms/", "");
    if (req.method === "POST") {
      assert.equal(req.headers["x-upsert"], "true");
      assert.equal(req.headers["content-type"], "image/png");
      const chunks = [];
      for await (const chunk of req) chunks.push(chunk);
      objects.set(key, Buffer.concat(chunks));
      res.end("{}");
    } else {
      res.end(objects.get(key));
    }
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const env = {
    SUPABASE_URL: `http://127.0.0.1:${server.address().port}`,
    SUPABASE_SERVICE_ROLE_KEY: "fixture-service-key",
    SUPABASE_STORAGE_BUCKET: "scsms",
  };
  const key = "school-logos/550e8400-e29b-41d4-a716-446655440000.png";
  try {
    await Promise.all([
      uploadFile(key, Buffer.from("fixture-image"), env),
      uploadFile(key, Buffer.from("fixture-image"), env),
    ]);
    assert.equal(bucketRequests.length, 1);
    assert.equal(bucketRequests[0].public, false);
    assert.equal(bucketRequests[0].id, "scsms");
    const downloaded = await downloadFile(key, env);
    assert.equal(downloaded.bytes.toString(), "fixture-image");
    assert.equal(downloaded.contentType, "image/png");
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
});

test("storage rejects placeholders, traversal, empty files and oversized streams", async () => {
  assert.throws(
    () =>
      storageConfig({
        SUPABASE_URL: "https://your-project.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "replace-me",
      }),
    /not configured/,
  );
  for (const key of [
    "../secret.png",
    "school-logos/../../secret.png",
    "school-logos/550e8400-e29b-41d4-a716-446655440000.exe",
    "school-logos/------------------------------------.png",
  ])
    assert.throws(() => fileContentType(key));
  await assert.rejects(readFileBytes((async function* () {})()), /empty/);
  await assert.rejects(
    readFileBytes(
      (async function* () {
        yield Buffer.alloc(MAX_FILE_BYTES + 1);
      })(),
    ),
    /5 MB/,
  );
});
