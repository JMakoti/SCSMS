import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@scsms/db/postgres";
import { users } from "@scsms/db/postgress-schemas/user";
import { changePasswordSchema } from "@scsms/features/schemas/profile-schema";
import { getAuthenticatedUser } from "@/lib/auth/session";

export async function POST(request: Request) {
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) {
    return NextResponse.json({ error: "Invalid request origin." }, { status: 403 });
  }
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Sign in to change your password." }, { status: 401 });
  const parsed = changePasswordSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  try {
    const [account] = await db.select({ passwordHash: users.passwordHash }).from(users)
      .where(eq(users.id, user.id)).limit(1);
    if (!account || !(await bcrypt.compare(parsed.data.currentPassword, account.passwordHash))) {
      return NextResponse.json({ error: "Your current password is incorrect." }, { status: 400 });
    }
    const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);
    const updated = await db.update(users).set({ passwordHash, updatedAt: new Date() })
      .where(and(eq(users.id, user.id), eq(users.passwordHash, account.passwordHash)))
      .returning({ id: users.id });
    if (!updated.length) return NextResponse.json({ error: "Your password changed during this request. Try again." }, { status: 409 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Password change failed", error);
    return NextResponse.json({ error: "Your password could not be changed. Please try again." }, { status: 500 });
  }
}
