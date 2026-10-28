import { and, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import { academicYears, schools, terms, wards } from "@scsms/db";

export function createLocalId() {
  return globalThis.crypto.randomUUID();
}

export function required(value: string | null | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

export function optional(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

export function optionalNumber(
  value: string | number | null | undefined,
  label: string,
) {
  const normalized = optional(value);
  if (normalized === null) return null;

  const parsed = Number(normalized.replace(/[^\d.-]/g, ""));
  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return parsed;
}

export function optionalInteger(
  value: string | number | null | undefined,
  label: string,
) {
  const parsed = optionalNumber(value, label);
  if (parsed === null) return null;

  return Math.trunc(parsed);
}

export async function resolveSchoolId(
  schoolNameOrId: string | null | undefined,
) {
  const value = required(schoolNameOrId, "School");
  const [school] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.id, value))
    .limit(1);

  if (school) return school.id;

  const [schoolByName] = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.displayName, value))
    .limit(1);

  if (!schoolByName) {
    throw new Error(`School "${value}" was not found in the local registry.`);
  }

  return schoolByName.id;
}

export async function resolveWardId(wardNameOrId: string | null | undefined) {
  const value = required(wardNameOrId, "Ward");
  const [ward] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(eq(wards.id, value))
    .limit(1);

  if (ward) return ward.id;

  const [wardByName] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(eq(wards.wardName, value))
    .limit(1);

  if (!wardByName) {
    throw new Error(`Ward "${value}" was not found.`);
  }

  return wardByName.id;
}

export async function resolveAcademicYearId(
  academicYearNameOrId: string | number | null | undefined,
) {
  const value = required(String(academicYearNameOrId ?? ""), "Academic year");
  const [year] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.id, value))
    .limit(1);

  if (year) return year.id;

  const [yearByName] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.name, value))
    .limit(1);

  if (!yearByName) {
    throw new Error(`Academic year "${value}" was not found.`);
  }

  return yearByName.id;
}

export async function resolveCurrentAcademicYearId() {
  const [currentYear] = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);

  if (!currentYear) {
    throw new Error("No current academic year is configured.");
  }

  return currentYear.id;
}

export async function resolveTermId(
  termNameOrId: string | null | undefined,
  academicYearId: string,
) {
  const value = optional(termNameOrId);
  if (value === null) return null;

  const [term] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(eq(terms.id, value))
    .limit(1);

  if (term) return term.id;

  const [termByName] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(and(eq(terms.academicYearId, academicYearId), eq(terms.name, value)))
    .limit(1);

  if (!termByName) {
    throw new Error(`Term "${value}" was not found for this academic year.`);
  }

  return termByName.id;
}
