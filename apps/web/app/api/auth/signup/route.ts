import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@scsms/db/postgres";
import { roles, users } from "@scsms/db/postgress-schemas/user";
import { subcounty } from "@scsms/db/postgress-schemas/subcounty_ward";
import { signupSchema } from "@scsms/features/schemas/signup-schema";

export async function GET() {
  try {
    const areas = await db.select({ id: subcounty.id, name: subcounty.subCounty }).from(subcounty).where(eq(subcounty.isActive, true));
    return NextResponse.json({ subcounties: areas.map((area) => ({ ...area, name: area.name || "Unnamed subcounty" })) });
  } catch { return NextResponse.json({ error: "Unable to load sign-up options." }, { status: 500 }); }
}
export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter valid account details. Passwords must contain 8 to 72 bytes." }, { status: 400 });
  const values = parsed.data;
  try {
    const [role, area, existing] = await Promise.all([
      db.select({ id: roles.id }).from(roles).where(eq(roles.name, "scde")).limit(1),
      db.select({ id: subcounty.id, knecCode: subcounty.knecCode }).from(subcounty).where(and(eq(subcounty.id, values.subcountyId), eq(subcounty.isActive, true))).limit(1),
      db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${values.email}`).limit(1),
    ]);
    if (!role.length) return NextResponse.json({ error: "The SCDE role is unavailable. Contact an administrator." }, { status: 503 });
    if (!area.length) return NextResponse.json({ error: "Select an active subcounty." }, { status: 400 });
    if (existing.length) return NextResponse.json({ error: "An account with that email already exists." }, { status: 409 });
    if (area[0].knecCode && area[0].knecCode !== values.knecCode) return NextResponse.json({ error: "The KNEC code does not match this subcounty." }, { status: 400 });
    await db.transaction(async (tx) => {
      const updated = await tx.update(subcounty).set({ knecCode: values.knecCode }).where(and(eq(subcounty.id, values.subcountyId), sql`(${subcounty.knecCode} IS NULL OR ${subcounty.knecCode} = ${values.knecCode})`)).returning({ id: subcounty.id });
      if (!updated.length) throw new Error("KNEC code mismatch");
      await tx.insert(users).values({ username: `SCDE${values.knecCode}`, name: values.name, email: values.email, phone: values.phone || null, roleId: role[0].id, subcountyId: values.subcountyId, passwordHash: await bcrypt.hash(values.password, 12), status: "inactive" });
    });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch { return NextResponse.json({ error: "Unable to create account. The email or generated username may already be registered." }, { status: 400 }); }
}
