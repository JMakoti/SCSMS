import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { createStaffMemberRecord } from "@/lib/staff-server";
import { addStaffSchema } from "@scsms/features/schemas/add-staff-schema";

export async function POST(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid staff record is required." },
      { status: 400 },
    );
  }

  const parsed = addStaffSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid staff values.",
      },
      { status: 400 },
    );
  }

  try {
    await createStaffMemberRecord(parsed.data);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The staff record could not be saved.",
      },
      { status: 400 },
    );
  }
}
