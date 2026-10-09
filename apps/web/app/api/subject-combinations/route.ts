import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createSubjectCombinationRecord } from "@/lib/subject-combinations-server";
import { subjectCombinationSchema } from "@scsms/features/schemas/subject-combination-schema";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const parsed = subjectCombinationSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          parsed.error.issues[0]?.message ??
          "Invalid subject combination values.",
      },
      { status: 400 },
    );
  }

  try {
    const id = await createSubjectCombinationRecord(parsed.data);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The subject combination could not be saved.",
      },
      { status: 400 },
    );
  }
}
