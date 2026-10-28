import { and, asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  enrollmentSnapshots,
  performanceRecords,
  reportRuns,
  terms,
} from "@scsms/db";

import { optional, required, resolveAcademicYearId } from "./helpers";

export type TermRecord = typeof terms.$inferSelect;
export type TermDetails = TermRecord & {
  academicYear: typeof academicYears.$inferSelect | null;
  enrollmentSnapshots: Array<typeof enrollmentSnapshots.$inferSelect>;
  performanceRecords: Array<typeof performanceRecords.$inferSelect>;
  reportRuns: Array<typeof reportRuns.$inferSelect>;
};

export type TermInput = {
  academicYear: string | number;
  name: string;
  startsOn?: string;
  endsOn?: string;
  sequence: number;
  isCurrent?: boolean;
};

export async function listTerms() {
  return db.select().from(terms).orderBy(asc(terms.sequence), asc(terms.name));
}

export async function listTermsForAcademicYear(academicYear: string | number) {
  const academicYearId = await resolveAcademicYearId(academicYear);

  return db
    .select()
    .from(terms)
    .where(eq(terms.academicYearId, academicYearId))
    .orderBy(asc(terms.sequence), asc(terms.name));
}

export async function getTerm(id: string) {
  const [term] = await db
    .select()
    .from(terms)
    .where(eq(terms.id, id))
    .limit(1);

  return term ?? null;
}

export async function getTermDetails(id: string) {
  const term = await getTerm(id);
  if (!term) return null;

  const [
    [academicYear],
    termEnrollmentSnapshots,
    termPerformanceRecords,
    termReportRuns,
  ] = await Promise.all([
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, term.academicYearId))
      .limit(1),
    db
      .select()
      .from(enrollmentSnapshots)
      .where(eq(enrollmentSnapshots.termId, id))
      .orderBy(asc(enrollmentSnapshots.capturedAt)),
    db
      .select()
      .from(performanceRecords)
      .where(eq(performanceRecords.termId, id))
      .orderBy(asc(performanceRecords.assessmentName)),
    db
      .select()
      .from(reportRuns)
      .where(eq(reportRuns.termId, id))
      .orderBy(asc(reportRuns.generatedAt)),
  ]);

  return {
    ...term,
    academicYear: academicYear ?? null,
    enrollmentSnapshots: termEnrollmentSnapshots,
    performanceRecords: termPerformanceRecords,
    reportRuns: termReportRuns,
  } satisfies TermDetails;
}

export async function createTerm(input: TermInput) {
  const academicYearId = await resolveAcademicYearId(input.academicYear);
  const name = required(input.name, "Term name");
  await ensureTermIsUnique(academicYearId, name, input.sequence);

  if (input.isCurrent) {
    await clearCurrentTerm(academicYearId);
  }

  await db.insert(terms).values({
    academicYearId,
    name,
    startsOn: optional(input.startsOn),
    endsOn: optional(input.endsOn),
    sequence: input.sequence,
    isCurrent: input.isCurrent ?? false,
  });
}

export async function updateTerm(id: string, input: TermInput) {
  const existing = await getTerm(id);
  if (!existing) {
    throw new Error("This term no longer exists. Refresh the list and try again.");
  }

  const academicYearId = await resolveAcademicYearId(input.academicYear);
  const name = required(input.name, "Term name");
  await ensureTermIsUnique(academicYearId, name, input.sequence, id);

  if (input.isCurrent) {
    await clearCurrentTerm(academicYearId);
  }

  await db
    .update(terms)
    .set({
      academicYearId,
      name,
      startsOn: optional(input.startsOn),
      endsOn: optional(input.endsOn),
      sequence: input.sequence,
      isCurrent: input.isCurrent ?? existing.isCurrent,
    })
    .where(eq(terms.id, id));
}

export async function setCurrentTerm(id: string) {
  const existing = await getTerm(id);
  if (!existing) {
    throw new Error("This term no longer exists. Refresh the list and try again.");
  }

  await clearCurrentTerm(existing.academicYearId);
  await db.update(terms).set({ isCurrent: true }).where(eq(terms.id, id));
}

export async function deleteTerm(id: string) {
  const existing = await getTerm(id);
  if (!existing) {
    throw new Error("This term no longer exists. Refresh the list and try again.");
  }

  await db.delete(terms).where(eq(terms.id, id));
}

async function ensureTermIsUnique(
  academicYearId: string,
  name: string,
  sequence: number,
  currentId?: string,
) {
  const duplicates = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.academicYearId, academicYearId),
        eq(terms.name, name),
      ),
    )
    .limit(1);

  if (duplicates.some((term) => term.id !== currentId)) {
    throw new Error(`Term "${name}" already exists for this academic year.`);
  }

  const sequenceDuplicates = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.academicYearId, academicYearId),
        eq(terms.sequence, sequence),
      ),
    )
    .limit(1);

  if (sequenceDuplicates.some((term) => term.id !== currentId)) {
    throw new Error(`Term sequence ${sequence} is already in use.`);
  }
}

async function clearCurrentTerm(academicYearId: string) {
  await db
    .update(terms)
    .set({ isCurrent: false })
    .where(eq(terms.academicYearId, academicYearId));
}
