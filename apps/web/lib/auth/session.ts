import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import { users } from "@scsms/db/postgress-schemas/user";

export const sessionCookieName = "scsms_session";
export const sessionLifetimeSeconds = 60 * 60 * 8;

type SessionClaims = {
  userId: string;
  expiresAt: number;
};

function getSessionSecret() {
  const secret = process.env.SCSMS_SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "SCSMS_SESSION_SECRET must be configured with at least 32 characters.",
    );
  }
  return secret;
}

function sign(payload: string) {
  return createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(userId: string) {
  const payload = Buffer.from(
    JSON.stringify({
      userId,
      expiresAt: Math.floor(Date.now() / 1000) + sessionLifetimeSeconds,
    } satisfies SessionClaims),
  ).toString("base64url");

  return `${payload}.${sign(payload)}`;
}

function parseSessionToken(token: string): SessionClaims | null {
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return null;

  const expected = Buffer.from(sign(payload));
  const supplied = Buffer.from(signature);
  if (
    expected.length !== supplied.length ||
    !timingSafeEqual(expected, supplied)
  ) {
    return null;
  }

  try {
    const claims = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8"),
    ) as Partial<SessionClaims>;

    if (
      typeof claims.userId !== "string" ||
      typeof claims.expiresAt !== "number" ||
      claims.expiresAt <= Math.floor(Date.now() / 1000)
    ) {
      return null;
    }

    return { userId: claims.userId, expiresAt: claims.expiresAt };
  } catch {
    return null;
  }
}

export async function getAuthenticatedUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(sessionCookieName)?.value;
  if (!token) return null;

  const claims = parseSessionToken(token);
  if (!claims) return null;

  const [user] = await db
    .select({ id: users.id, email: users.email, name: users.name })
    .from(users)
    .where(and(eq(users.id, claims.userId), eq(users.status, "active")))
    .limit(1);

  return user ?? null;
}
