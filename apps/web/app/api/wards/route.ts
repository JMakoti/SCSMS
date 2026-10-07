import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { db } from "@scsms/db/postgres";
import {
  subcounty as subCountyTable,
  wards,
} from "@scsms/db/postgress-schemas/index";
import { addWardSchema } from "@scsms/features/schemas/add-ward-schema";

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
      { error: "A valid ward record is required." },
      { status: 400 },
    );
  }

  const parsed = addWardSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid ward details." },
      { status: 400 },
    );
  }

  try {
    const [parentSubCounty] = await db
      .select({ id: subCountyTable.id })
      .from(subCountyTable)
      .where(
        and(
          eq(subCountyTable.id, parsed.data.subCountyId),
          eq(subCountyTable.isActive, true),
        ),
      )
      .limit(1);
    if (!parentSubCounty) {
      return NextResponse.json(
        { error: "The selected sub-county was not found." },
        { status: 400 },
      );
    }

    const [existing] = await db
      .select({ id: wards.id })
      .from(wards)
      .where(eq(wards.wardCode, parsed.data.wardCode))
      .limit(1);
    if (existing) {
      return NextResponse.json(
        { error: `Ward code ${parsed.data.wardCode} is already in use.` },
        { status: 409 },
      );
    }

    await db.insert(wards).values({
      ...parsed.data,
      isActive: true,
    });
    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Could not create ward record.", error);
    return NextResponse.json(
      { error: "The ward could not be saved." },
      { status: 500 },
    );
  }
}
