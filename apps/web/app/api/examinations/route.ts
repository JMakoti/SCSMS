import { NextResponse } from "next/server";
import { examinationAccess, examinationStore } from "@/lib/examinations-server";
import { examinationSaveSchema, examinationFiltersSchema } from "@scsms/features/examinations/model";
import { loadExamination, saveExamination } from "@scsms/features/examinations/service";

export async function GET(request: Request) {
  const parsed = examinationFiltersSchema.safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!parsed.success) return NextResponse.json({ error: "Invalid examination filters." }, { status: 400 });
  try {
    const access = await examinationAccess(parsed.data.schoolId);
    if (!access) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!access.canRead) return NextResponse.json({ error: "You do not have access to this school's examinations." }, { status: 403 });
    return NextResponse.json(await loadExamination(examinationStore.query, parsed.data, access), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Examination dashboard failed", error);
    return NextResponse.json({ error: "Examination records could not be loaded. Please retry or contact your administrator." }, { status: 500 });
  }
}
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid examination data." }, { status: 400 }); }
  const parsed = examinationSaveSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid results." }, { status: 400 });
  try {
    const access = await examinationAccess(parsed.data.schoolId);
    if (!access) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
    if (!access.canWrite) return NextResponse.json({ error: "You do not have permission to save this school's results." }, { status: 403 });
    await saveExamination(examinationStore, parsed.data, access);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Examination save failed", error);
    return NextResponse.json({ error: error instanceof Error && !("code" in error) ? error.message : "Examination results could not be saved." }, { status: 400 });
  }
}
