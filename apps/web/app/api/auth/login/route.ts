import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { db } from "@scsms/db/postgres";
import { users } from "@scsms/db/postgress-schemas/user";
import {
  createSessionToken,
  sessionCookieName,
  sessionLifetimeSeconds,
} from "@/lib/auth/session";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (
    !body ||
    typeof body !== "object" ||
    !("email" in body) ||
    !("password" in body) ||
    typeof body.email !== "string" ||
    typeof body.password !== "string"
  ) {
    return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
  }

  const email = body.email.trim().toLowerCase();
  const password = body.password;
  if (!email || !password || email.length > 320 || password.length > 1024) {
    return NextResponse.json({ error: "Invalid login details." }, { status: 400 });
  }

  const [user] = await db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      passwordHash: users.passwordHash,
      status: users.status,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (
    !user ||
    user.status !== "active" ||
    !(await bcrypt.compare(password, user.passwordHash))
  ) {
    return NextResponse.json(
      { error: "Email or password is incorrect." },
      { status: 401 },
    );
  }

  await db
    .update(users)
    .set({ lastLoginAt: new Date(), updatedAt: new Date() })
    .where(eq(users.id, user.id));

  const response = NextResponse.json({
    user: { email: user.email, name: user.name },
  });
  response.cookies.set(sessionCookieName, createSessionToken(user.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: sessionLifetimeSeconds,
  });
  return response;
}
