import { getAuthenticatedUser } from "@/lib/auth/session";
import { downloadFile, fileContentType } from "@scsms/db/storage";

export async function GET(_request: Request, context: { params: Promise<{ path: string[] }> }) {
  if (!await getAuthenticatedUser()) return Response.json({ error: "Authentication required." }, { status: 401 });
  const key = (await context.params).path.join("/");
  try { fileContentType(key); }
  catch { return Response.json({ error: "Invalid logo reference." }, { status: 400 }); }
  try {
    const file = await downloadFile(key);
    return new Response(new Uint8Array(file.bytes), { headers: {
      "Content-Type": file.contentType, "Cache-Control": "private, max-age=3600",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
    } });
  } catch { return Response.json({ error: "The school logo is unavailable." }, { status: 503 }); }
}
