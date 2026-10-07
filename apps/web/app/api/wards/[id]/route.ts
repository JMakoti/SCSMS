import { and, eq, ne } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@scsms/db/postgres";
import {
  subcounty as subCountyTable,
  wards,
} from "@scsms/db/postgress-schemas/index";
import { editWardRecordSchema } from "@scsms/features/schemas/edit-ward-record-schema";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
      { error: "A valid ward record is required." },
      { status: 400 },
    );
  }

  const parsed = editWardRecordSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid ward details." },
      { status: 400 },
    );
  }

  const { id } = await params;
  const { wardName, wardCode, subCountyId, notes } = parsed.data.fields;
  try {
    const [[ward], [parentSubCounty], [duplicate]] = await Promise.all([
      db.select({ id: wards.id }).from(wards).where(eq(wards.id, id)).limit(1),
      db
        .select({ id: subCountyTable.id })
        .from(subCountyTable)
        .where(eq(subCountyTable.id, subCountyId))
        .limit(1),
      db
        .select({ id: wards.id })
        .from(wards)
        .where(and(eq(wards.wardCode, wardCode), ne(wards.id, id)))
        .limit(1),
    ]);

    if (!ward) {
      return NextResponse.json(
        { error: "This ward no longer exists. Refresh the list and try again." },
        { status: 404 },
      );
    }
    if (!parentSubCounty) {
      return NextResponse.json(
        { error: "The selected sub-county was not found." },
        { status: 400 },
      );
    }
    if (duplicate) {
      return NextResponse.json(
        { error: `Ward code ${wardCode} is already in use.` },
        { status: 409 },
      );
    }

    const [updatedWard] = await db
      .update(wards)
      .set({
        wardName,
        wardCode,
        subCountyId,
        notes: notes || null,
        updatedAt: new Date(),
      })
      .where(eq(wards.id, id))
      .returning({ id: wards.id });
    if (!updatedWard) {
      return NextResponse.json(
        { error: "This ward no longer exists. Refresh the list and try again." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not update ward record.", error);
    return NextResponse.json(
      { error: "The ward could not be saved." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getAuthenticatedUser();
  if (!user) {
    return NextResponse.json(
      { error: "Authentication required." },
      { status: 401 },
    );
  }

  const { id } = await params;
  try {
    const [deletedWard] = await db
      .delete(wards)
      .where(eq(wards.id, id))
      .returning({ id: wards.id });
    if (!deletedWard) {
      return NextResponse.json(
        { error: "This ward no longer exists. Refresh the list and try again." },
        { status: 404 },
      );
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Could not delete ward record.", error);
    return NextResponse.json(
      { error: "The ward could not be deleted. Check for records that still use it." },
      { status: 409 },
    );
  }
}
