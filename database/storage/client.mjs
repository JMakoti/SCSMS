export const MAX_FILE_BYTES = 5 * 1024 * 1024;
const types = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", webp: "image/webp", svg: "image/svg+xml" };
const buckets = new Map();

export function fileContentType(key) {
  if (!/^school-logos\/(?:[a-f0-9]{32}|[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})\.(png|jpe?g|webp|svg)$/.test(key)) throw new Error("Invalid school logo object key.");
  return types[key.split(".").at(-1)];
}

export function storageConfig(env = process.env) {
  const url = env.SUPABASE_URL?.replace(/\/+$/, "");
  const key = env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = env.SUPABASE_STORAGE_BUCKET || "scsms";
  if (!url || !key || url.includes("your-project") || key.startsWith("replace-")) {
    throw new Error("Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY on the server.");
  }
  const parsed = new URL(url);
  if (!(parsed.protocol === "https:" || (parsed.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname))) || !/^[a-zA-Z0-9_-]+$/.test(bucket)) {
    throw new Error("Invalid Supabase Storage configuration.");
  }
  return { url, key, bucket };
}

export async function readFileBytes(stream) {
  const chunks = [];
  let size = 0;
  if (!stream) throw new Error("Choose a file to upload.");
  for await (const chunk of stream) {
    size += chunk.length;
    if (size > MAX_FILE_BYTES) throw new Error("School logos must be 5 MB or smaller.");
    chunks.push(Buffer.from(chunk));
  }
  if (!size) throw new Error("The school logo file is empty.");
  return Buffer.concat(chunks);
}

function objectUrl(config, key, authenticated = false) {
  fileContentType(key);
  return `${config.url}/storage/v1/object/${authenticated ? "authenticated/" : ""}${encodeURIComponent(config.bucket)}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

async function ensureBucket(config) {
  const cacheKey = `${config.url}/${config.bucket}`;
  if (buckets.has(cacheKey)) return buckets.get(cacheKey);
  const operation = (async () => {
    const headers = { apikey: config.key, Authorization: `Bearer ${config.key}` };
    const existing = await fetch(`${config.url}/storage/v1/bucket/${encodeURIComponent(config.bucket)}`, { headers, signal: AbortSignal.timeout(15_000), redirect: "error" });
    await existing.body?.cancel();
    if (existing.ok) return;
    if (existing.status !== 404 && existing.status !== 400) throw new Error(`Could not access Supabase Storage bucket (${existing.status}).`);
    const created = await fetch(`${config.url}/storage/v1/bucket`, {
      method: "POST", headers: { ...headers, "Content-Type": "application/json" },
      body: JSON.stringify({ id: config.bucket, name: config.bucket, public: false, file_size_limit: MAX_FILE_BYTES, allowed_mime_types: [...new Set(Object.values(types))] }),
      signal: AbortSignal.timeout(15_000), redirect: "error",
    });
    await created.body?.cancel();
    if (!created.ok && created.status !== 409) throw new Error(`Could not create Supabase Storage bucket (${created.status}).`);
  })();
  buckets.set(cacheKey, operation);
  try { await operation; } catch (error) { buckets.delete(cacheKey); throw error; }
}

export async function uploadFile(key, bytes, env = process.env) {
  const contentType = fileContentType(key);
  if (!bytes.length || bytes.length > MAX_FILE_BYTES) throw new Error("Choose a non-empty school logo up to 5 MB.");
  const config = storageConfig(env);
  await ensureBucket(config);
  const response = await fetch(objectUrl(config, key), {
    method: "POST", headers: { apikey: config.key, Authorization: `Bearer ${config.key}`, "Content-Type": contentType, "x-upsert": "true", "cache-control": "31536000" },
    body: bytes, signal: AbortSignal.timeout(45_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Supabase Storage upload failed (${response.status}). Check the server credentials and bucket scsms.`);
  await response.body?.cancel();
  return key;
}

export async function downloadFile(key, env = process.env) {
  const config = storageConfig(env);
  const response = await fetch(objectUrl(config, key, true), {
    headers: { apikey: config.key, Authorization: `Bearer ${config.key}` }, signal: AbortSignal.timeout(45_000), redirect: "error",
  });
  if (!response.ok) throw new Error(`Supabase Storage download failed (${response.status}).`);
  return { bytes: await readFileBytes(response.body), contentType: fileContentType(key) };
}
