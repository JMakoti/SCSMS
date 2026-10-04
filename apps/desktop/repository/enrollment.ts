import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  enrollmentGradeRows,
  enrollmentSnapshots,
  schools,
  terms,
} from "@scsms/db";

import {
  createLocalId,
  optional,
  optionalInteger,
  required,
  resolveAcademicYearId,
  resolveSchoolId,
  resolveTermId,
} from "./helpers";

export type EnrollmentSnapshot = typeof enrollmentSnapshots.$inferSelect;
export type EnrollmentGradeRow = typeof enrollmentGradeRows.$inferSelect;
export type EnrollmentSnapshotDetails = EnrollmentSnapshot & {
  school: typeof schools.$inferSelect | null;
  academicYear: typeof academicYears.$inferSelect | null;
  term: typeof terms.$inferSelect | null;
  gradeRows: EnrollmentGradeRow[];
};

export type EnrollmentGradeRowInput = {
  grade: string;
  gradeBand: string;
  male?: number | string;
  female?: number | string;
};

export type CreateEnrollmentSnapshotInput = {
  school: string;
  academicYear: string | number;
  term?: string;
  status?: EnrollmentSnapshot["status"];
  capturedBy?: string;
  notes?: string;
  gradeRows?: EnrollmentGradeRowInput[];
};

export async function listEnrollmentSnapshots() {
  return db
    .select()
    .from(enrollmentSnapshots)
    .orderBy(asc(enrollmentSnapshots.capturedAt));
}

export async function getEnrollmentSnapshot(id: string) {
  const [snapshot] = await db
    .select()
    .from(enrollmentSnapshots)
    .where(eq(enrollmentSnapshots.id, id))
    .limit(1);

  return snapshot ?? null;
}

export async function getEnrollmentSnapshotDetails(id: string) {
  const snapshot = await getEnrollmentSnapshot(id);
  if (!snapshot) return null;

  const [[school], [academicYear], termResult, gradeRows] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, snapshot.schoolId)).limit(1),
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, snapshot.academicYearId))
      .limit(1),
    snapshot.termId
      ? db.select().from(terms).where(eq(terms.id, snapshot.termId)).limit(1)
      : Promise.resolve([]),
    listEnrollmentGradeRows(id),
  ]);

  return {
    ...snapshot,
    school: school ?? null,
    academicYear: academicYear ?? null,
    term: termResult[0] ?? null,
    gradeRows,
  } satisfies EnrollmentSnapshotDetails;
}

export async function listEnrollmentGradeRows(snapshotId: string) {
  return db
    .select()
    .from(enrollmentGradeRows)
    .where(eq(enrollmentGradeRows.snapshotId, snapshotId))
    .orderBy(asc(enrollmentGradeRows.grade));
}

export async function createEnrollmentSnapshot(
  input: CreateEnrollmentSnapshotInput,
) {
  const snapshotId = createLocalId();
  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db.insert(enrollmentSnapshots).values({
    id: snapshotId,
    schoolId: await resolveSchoolId(input.school),
    academicYearId,
    termId: await resolveTermId(input.term, academicYearId),
    status: input.status ?? "draft",
    capturedBy: optional(input.capturedBy),
    notes: optional(input.notes),
  });

  await replaceEnrollmentGradeRows(snapshotId, input.gradeRows ?? []);

  return snapshotId;
}

export async function updateEnrollmentSnapshot(
  id: string,
  input: CreateEnrollmentSnapshotInput,
) {
  const existing = await getEnrollmentSnapshot(id);
  if (!existing) {
    throw new Error(
      "This enrollment snapshot no longer exists. Refresh the list and try again.",
    );
  }

  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db
    .update(enrollmentSnapshots)
    .set({
      schoolId: await resolveSchoolId(input.school),
      academicYearId,
      termId: await resolveTermId(input.term, academicYearId),
      status: input.status ?? existing.status,
      capturedBy: optional(input.capturedBy),
      notes: optional(input.notes),
    })
    .where(eq(enrollmentSnapshots.id, id));

  await replaceEnrollmentGradeRows(id, input.gradeRows ?? []);
}

export async function deleteEnrollmentSnapshot(id: string) {
  const existing = await getEnrollmentSnapshot(id);
  if (!existing) {
    throw new Error(
      "This enrollment snapshot no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(enrollmentSnapshots).where(eq(enrollmentSnapshots.id, id));
}

async function replaceEnrollmentGradeRows(
  snapshotId: string,
  rows: EnrollmentGradeRowInput[],
) {
  await db
    .delete(enrollmentGradeRows)
    .where(eq(enrollmentGradeRows.snapshotId, snapshotId));

  if (rows.length === 0) return;

  await db.insert(enrollmentGradeRows).values(
    rows.map((row) => {
      const male = optionalInteger(row.male, "Male enrollment") ?? 0;
      const female = optionalInteger(row.female, "Female enrollment") ?? 0;

      return {
        snapshotId,
        grade: required(row.grade, "Grade"),
        gradeBand: required(row.gradeBand, "Grade band"),
        male,
        female,
        total: male + female,
      };
    }),
  );
}
