import { eq } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import { schools } from "@scsms/db/postgress-schemas/index";
import type { contacts } from "@scsms/db/postgress-schemas/index";

type Contact = typeof contacts.$inferSelect;

export function contactRoles(role: string): NonNullable<Contact["titleType"]> {
  const roles: Record<string, NonNullable<Contact["titleType"]>> = {
    "head teacher": "head_teacher",
    headteacher: "head_teacher",
    principal: "head_teacher",
    deputy: "deputy",
    "deputy head teacher": "deputy",
    bursar: "bursar",
    "school bursar": "bursar",
    "board chair": "board_chair",
    "board chairperson": "board_chair",
    "senior teacher": "senior_teacher",
  };
  const titleType = roles[role.trim().toLowerCase()];
  if (!titleType) {
    throw new Error(`Unsupported contact role "${role}".`);
  }

  return titleType;
}

export function mapActiveStatus(status: string | undefined) {
  if (!status) return true;
  return status.trim().toLowerCase() !== "inactive";
}

export async function resolveContactSchoolId(schoolNameOrId: string) {
  const value = schoolNameOrId.trim();
  const [schoolById] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, value))
    .limit(1);

  if (schoolById) return schoolById.id;

  const [schoolByName] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.displayName, value))
    .limit(1);

  if (!schoolByName) {
    throw new Error(`School "${value}" was not found in the school registry.`);
  }

  return schoolByName.id;
}
