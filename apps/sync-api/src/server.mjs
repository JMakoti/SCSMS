import { createServer } from "node:http";
import { timingSafeEqual } from "node:crypto";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import postgres from "postgres";
import { initialize, exchange } from "./sync.mjs";
import { validateRequest } from "./tables.mjs";
import { fileContentType, readFileBytes, uploadFile, downloadFile } from "../../../database/storage/client.mjs";

dotenv.config({ path: fileURLToPath(new URL("../../../.env", import.meta.url)) });
const token = process.env.SCSMS_SYNC_TOKEN;
if (!token || token.length < 32) throw new Error("SCSMS_SYNC_TOKEN must contain at least 32 random characters");
if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required");
const sql = postgres(process.env.DATABASE_URL, { max: 2, connect_timeout: 10, idle_timeout: 20, connection: { application_name: "scsms-sync-api" } });
const metadata = await initialize(sql);
const server = createServer(async (request, response) => {
  response.setHeader("Content-Type", "application/json");
  response.setHeader("Cache-Control", "no-store");
  const reply = (status, body) => { response.writeHead(status); response.end(JSON.stringify(body)); };
  if (request.url === "/health" && request.method === "GET") { reply(200, { status: "ok" }); return; }
  const fileRoute = request.url?.startsWith("/v1/files/") && ["PUT", "GET"].includes(request.method);
  if (!fileRoute && (request.url !== "/v1/sync" || request.method !== "POST")) { reply(404, { error: "Not found" }); return; }
  const supplied = Buffer.from(request.headers.authorization ?? "");
  const expected = Buffer.from(`Bearer ${token}`);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) { reply(401, { error: "Unauthorized" }); return; }
  if (fileRoute) {
    let key;
    try { key = decodeURIComponent(request.url.slice("/v1/files/".length)); fileContentType(key); }
    catch { reply(400, { error: "Invalid school logo object key." }); return; }
    try {
      if (request.method === "PUT") {
        const bytes = await readFileBytes(request);
        await uploadFile(key, bytes);
        reply(200, { key });
      } else {
        const file = await downloadFile(key);
        response.setHeader("Content-Type", file.contentType);
        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
        response.writeHead(200); response.end(file.bytes);
      }
    } catch (error) { reply(error.message.includes("5 MB") || error.message.includes("empty") ? 400 : 503, { error: error.message }); }
    return;
  }
  let body;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 5 * 1024 * 1024) { reply(413, { error: "Request too large" }); return; }
      chunks.push(chunk);
    }
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    validateRequest(body);
  } catch { reply(400, { error: "Invalid sync request" }); return; }
  try { reply(200, await exchange(sql, metadata, body)); }
  catch (error) {
    console.error("Sync transaction failed", { code: error.code, message: error.message });
    reply(409, { error: "Sync transaction failed. Resolve conflicting records or check the server logs, then retry." });
  }
});
server.requestTimeout = 30_000;
server.headersTimeout = 10_000;
server.listen(Number(process.env.SCSMS_SYNC_PORT ?? 4001), process.env.SCSMS_SYNC_HOST ?? "127.0.0.1", () => {
  console.log("SCSMS sync API ready");
});
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => {
  server.close(async () => { await sql.end({ timeout: 5 }); process.exit(0); });
});
