import { randomUUID } from "node:crypto";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { fileContentType, readFileBytes, uploadFile } from "@scsms/db/storage";

export async function POST(request: Request) {
  if (!await getAuthenticatedUser()) return Response.json({ error: "Authentication required." }, { status: 401 });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) {
    return Response.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const extension = request.headers.get("x-file-extension")?.toLowerCase();
  const key = `school-logos/${randomUUID()}.${extension}`;
  try { fileContentType(key); }
  catch { return Response.json({ error: "Choose a PNG, JPG, JPEG, WEBP, or SVG image." }, { status: 400 }); }
  try {
    const bytes = await readFileBytes(request.body);
    await uploadFile(key, bytes);
    return Response.json({ key });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "The logo could not be uploaded." }, { status: 400 });
  }
}
