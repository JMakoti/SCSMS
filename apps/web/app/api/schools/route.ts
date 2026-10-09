import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createSchoolRecord } from "@/lib/school-server";
import { addSchoolSchema } from "@scsms/features/schemas/add-school-schema";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const parsed = addSchoolSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid school values." },
      { status: 400 },
    );
  }

  try {
    await createSchoolRecord(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "The school could not be saved.",
      },
      { status: 400 },
    );
  }
}
