import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import {
  deleteStaffMemberRecord,
  updateStaffMemberRecord,
} from "@/lib/staff-server";
import { editRecordSchema } from "@scsms/features/schemas/edit-record-schema";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
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

  const parsed = editRecordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Invalid staff values.",
      },
      { status: 400 },
    );
  }

  try {
    const { id } = await context.params;
    await updateStaffMemberRecord(id, parsed.data);
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

export async function DELETE(_request: Request, context: RouteContext) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  try {
    const { id } = await context.params;
    await deleteStaffMemberRecord(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "The staff record could not be deleted.",
      },
      { status: 400 },
    );
  }
}
