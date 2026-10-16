import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import { users } from "@scsms/db/postgress-schemas/user";
import { profileSchema } from "@scsms/features/schemas/profile-schema";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function PATCH(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to update your profile." }, { status: 401 });
  const parsed = profileSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  const values = parsed.data;
  if (values.email !== user.email.toLowerCase()) {
    return NextResponse.json({ error: "Your sign-in email cannot be changed." }, { status: 400 });
  }
  if (values.subcountyId !== (user.subcountyId ?? "")) {
    return NextResponse.json({ error: "Your assigned sub-county cannot be changed." }, { status: 400 });
  }
  try {
    await db.update(users).set({
      name: values.name, phone: values.phone || null,
      updatedAt: new Date(),
    }).where(eq(users.id, user.id));
    return NextResponse.json({ profile: { ...values, email: user.email, subcountyId: user.subcountyId ?? "" } });
  } catch (error) {
    console.error("Profile update failed", error);
    return NextResponse.json({ error: "Your profile could not be saved. Please try again." }, { status: 400 });
  }
}
