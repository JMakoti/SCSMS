import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  performanceRecords,
  performanceSubjectRows,
  schools,
  terms,
} from "@scsms/db";

import {
  createLocalId,
  optional,
  optionalInteger,
  optionalNumber,
  required,
  resolveAcademicYearId,
  resolveSchoolId,
  resolveTermId,
} from "./helpers";

export type PerformanceRecord = typeof performanceRecords.$inferSelect;
export type PerformanceSubjectRow = typeof performanceSubjectRows.$inferSelect;
export type PerformanceRecordDetails = PerformanceRecord & {
  school: typeof schools.$inferSelect | null;
  academicYear: typeof academicYears.$inferSelect | null;
  term: typeof terms.$inferSelect | null;
  subjects: PerformanceSubjectRow[];
};

export type PerformanceSubjectRowInput = {
  subject: string;
  candidates?: number | string;
  averageScore?: number | string;
  passRate?: number | string;
};

export type CreatePerformanceRecordInput = {
  school: string;
  academicYear: string | number;
  term?: string;
  assessmentName: string;
  assessmentType?: PerformanceRecord["assessmentType"];
  gradeBand?: string;
  candidates?: number | string;
  averageScore?: number | string;
  passRate?: number | string;
  ranking?: number | string;
  status?: PerformanceRecord["status"];
  notes?: string;
  subjects?: PerformanceSubjectRowInput[];
};

export async function listPerformanceRecords() {
  return db
    .select()
    .from(performanceRecords)
    .orderBy(asc(performanceRecords.assessmentName));
}

export async function getPerformanceRecord(id: string) {
  const [record] = await db
    .select()
    .from(performanceRecords)
    .where(eq(performanceRecords.id, id))
    .limit(1);

  return record ?? null;
}

export async function getPerformanceRecordDetails(id: string) {
  const record = await getPerformanceRecord(id);
  if (!record) return null;

  const [[school], [academicYear], termResult, subjects] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, record.schoolId)).limit(1),
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, record.academicYearId))
      .limit(1),
    record.termId
      ? db.select().from(terms).where(eq(terms.id, record.termId)).limit(1)
      : Promise.resolve([]),
    listPerformanceSubjectRows(id),
  ]);

  return {
    ...record,
    school: school ?? null,
    academicYear: academicYear ?? null,
    term: termResult[0] ?? null,
    subjects,
  } satisfies PerformanceRecordDetails;
}

export async function listPerformanceSubjectRows(performanceRecordId: string) {
  return db
    .select()
    .from(performanceSubjectRows)
    .where(eq(performanceSubjectRows.performanceRecordId, performanceRecordId))
    .orderBy(asc(performanceSubjectRows.subject));
}

export async function createPerformanceRecord(
  input: CreatePerformanceRecordInput,
) {
  const performanceRecordId = createLocalId();
  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db.insert(performanceRecords).values({
    id: performanceRecordId,
    schoolId: await resolveSchoolId(input.school),
    academicYearId,
    termId: await resolveTermId(input.term, academicYearId),
    assessmentName: required(input.assessmentName, "Assessment name"),
    assessmentType: input.assessmentType ?? "internal",
    gradeBand: optional(input.gradeBand),
    candidates: optionalInteger(input.candidates, "Candidates") ?? 0,
    averageScore: optionalNumber(input.averageScore, "Average score"),
    passRate: optionalNumber(input.passRate, "Pass rate"),
    ranking: optionalInteger(input.ranking, "Ranking"),
    status: input.status ?? "draft",
    notes: optional(input.notes),
  });

  await replacePerformanceSubjectRows(
    performanceRecordId,
    input.subjects ?? [],
  );

  return performanceRecordId;
}

export async function updatePerformanceRecord(
  id: string,
  input: CreatePerformanceRecordInput,
) {
  const existing = await getPerformanceRecord(id);
  if (!existing) {
    throw new Error(
      "This performance record no longer exists. Refresh the list and try again.",
    );
  }

  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db
    .update(performanceRecords)
    .set({
      schoolId: await resolveSchoolId(input.school),
      academicYearId,
      termId: await resolveTermId(input.term, academicYearId),
      assessmentName: required(input.assessmentName, "Assessment name"),
      assessmentType: input.assessmentType ?? existing.assessmentType,
      gradeBand: optional(input.gradeBand),
      candidates: optionalInteger(input.candidates, "Candidates") ?? 0,
      averageScore: optionalNumber(input.averageScore, "Average score"),
      passRate: optionalNumber(input.passRate, "Pass rate"),
      ranking: optionalInteger(input.ranking, "Ranking"),
      status: input.status ?? existing.status,
      notes: optional(input.notes),
    })
    .where(eq(performanceRecords.id, id));

  await replacePerformanceSubjectRows(id, input.subjects ?? []);
}

export async function deletePerformanceRecord(id: string) {
  const existing = await getPerformanceRecord(id);
  if (!existing) {
    throw new Error(
      "This performance record no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(performanceRecords).where(eq(performanceRecords.id, id));
}

async function replacePerformanceSubjectRows(
  performanceRecordId: string,
  rows: PerformanceSubjectRowInput[],
) {
  await db
    .delete(performanceSubjectRows)
    .where(eq(performanceSubjectRows.performanceRecordId, performanceRecordId));

  if (rows.length === 0) return;

  await db.insert(performanceSubjectRows).values(
    rows.map((row) => ({
      performanceRecordId,
      subject: required(row.subject, "Subject"),
      candidates: optionalInteger(row.candidates, "Subject candidates") ?? 0,
      averageScore: optionalNumber(row.averageScore, "Subject average score"),
      passRate: optionalNumber(row.passRate, "Subject pass rate"),
    })),
  );
}
