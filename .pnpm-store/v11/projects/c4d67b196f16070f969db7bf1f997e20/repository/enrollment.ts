import { and, asc, eq } from "drizzle-orm";

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
import type { EnrollmentGradeSaveInput } from "@scsms/features/schemas/enrollment-grade-schema";

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

type SchoolLevel = "Primary" | "Junior_Secondary" | "Senior_School";

const gradesBySchoolLevel: Record<
  SchoolLevel,
  Array<{ grade: string; gradeBand: string }>
> = {
  Primary: [
    ...["PP1", "PP2", "PP3"].map((grade) => ({
      grade,
      gradeBand: "PP1-PP3",
    })),
    ...Array.from({ length: 6 }, (_, index) => ({
      grade: `Grade ${index + 1}`,
      gradeBand: "Grade 1-6",
    })),
  ],
  Junior_Secondary: Array.from({ length: 3 }, (_, index) => ({
    grade: `Grade ${index + 7}`,
    gradeBand: "Grade 7-9",
  })),
  Senior_School: Array.from({ length: 3 }, (_, index) => ({
    grade: `Grade ${index + 10}`,
    gradeBand: "Grade 10-12",
  })),
};

export async function listEnrollmentSnapshots() {
  return db
    .select()
    .from(enrollmentSnapshots)
    .orderBy(asc(enrollmentSnapshots.capturedAt));
}

export async function saveEnrollmentGrade(input: EnrollmentGradeSaveInput) {
  if (
    !Number.isSafeInteger(input.male) ||
    !Number.isSafeInteger(input.female) ||
    input.male < 0 ||
    input.female < 0
  ) {
    throw new Error("Boys and girls counts must be non-negative whole numbers.");
  }

  const [term] = await db
    .select({ id: terms.id })
    .from(terms)
    .where(
      and(
        eq(terms.id, input.termId),
        eq(terms.academicYearId, input.academicYearId),
      ),
    )
    .limit(1);
  if (!term) {
    throw new Error("The selected term was not found for this academic year.");
  }

  let [snapshot] = await db
    .select({ id: enrollmentSnapshots.id })
    .from(enrollmentSnapshots)
    .where(
      and(
        eq(enrollmentSnapshots.schoolId, input.schoolId),
        eq(enrollmentSnapshots.academicYearId, input.academicYearId),
        eq(enrollmentSnapshots.termId, input.termId),
      ),
    )
    .limit(1);

  if (!snapshot) {
    const snapshotId = createLocalId();
    await db.insert(enrollmentSnapshots).values({
      id: snapshotId,
      schoolId: input.schoolId,
      academicYearId: input.academicYearId,
      termId: input.termId,
      status: "draft",
    });
    snapshot = { id: snapshotId };
  }

  const rowValues = {
    gradeBand: input.gradeBand,
    male: input.male,
    female: input.female,
    total: input.male + input.female,
  };
  const [existingRow] = await db
    .select({ id: enrollmentGradeRows.id })
    .from(enrollmentGradeRows)
    .where(
      and(
        eq(enrollmentGradeRows.snapshotId, snapshot.id),
        eq(enrollmentGradeRows.grade, input.grade),
      ),
    )
    .limit(1);

  if (existingRow) {
    await db
      .update(enrollmentGradeRows)
      .set(rowValues)
      .where(eq(enrollmentGradeRows.id, existingRow.id));
    return;
  }

  await db.insert(enrollmentGradeRows).values({
    id: createLocalId(),
    snapshotId: snapshot.id,
    grade: input.grade,
    ...rowValues,
  });
}

export async function initializeSchoolEnrollment(
  schoolId: string,
  schoolLevel: SchoolLevel,
) {
  const academicYear = await resolveEnrollmentAcademicYear();
  const yearTerms = await ensureEnrollmentTerms(academicYear.id);
  const grades = gradesBySchoolLevel[schoolLevel];
  const snapshotIds = yearTerms.map(() => createLocalId());

  await db.insert(enrollmentSnapshots).values(
    yearTerms.map((term, index) => ({
      id: snapshotIds[index],
      schoolId,
      academicYearId: academicYear.id,
      termId: term.id,
      status: "draft" as const,
    })),
  );

  await db.insert(enrollmentGradeRows).values(
    snapshotIds.flatMap((snapshotId) =>
      grades.map(({ grade, gradeBand }) => ({
        snapshotId,
        grade,
        gradeBand,
        male: 0,
        female: 0,
        total: 0,
      })),
    ),
  );
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

async function resolveEnrollmentAcademicYear() {
  const [currentYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);
  if (currentYear) return currentYear;

  const configuredYears = await db
    .select()
    .from(academicYears)
    .orderBy(asc(academicYears.name));
  if (configuredYears[0]) {
    const year = configuredYears[0];
    await db
      .update(academicYears)
      .set({
        isCurrent: true,
        status: "active",
        updatedAt: new Date().toISOString(),
      })
      .where(eq(academicYears.id, year.id));
    return { ...year, isCurrent: true, status: "active" as const };
  }

  const yearName = String(new Date().getFullYear());
  const yearId = `ay-${yearName}`;
  const startsOn = `${yearName}-01-01`;
  const endsOn = `${yearName}-12-31`;
  await db.insert(academicYears).values({
    id: yearId,
    name: yearName,
    startsOn,
    endsOn,
    status: "active",
    isCurrent: true,
  });

  const [createdYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.id, yearId))
    .limit(1);
  if (!createdYear) {
    throw new Error("The current academic year could not be initialized.");
  }
  return createdYear;
}

async function ensureEnrollmentTerms(academicYearId: string) {
  const configuredTerms = await db
    .select()
    .from(terms)
    .where(eq(terms.academicYearId, academicYearId))
    .orderBy(asc(terms.sequence));
  const termsBySequence = new Map(
    configuredTerms.map((term) => [term.sequence, term]),
  );

  for (const sequence of [1, 2, 3]) {
    if (termsBySequence.has(sequence)) continue;

    const term = {
      id: createLocalId(),
      academicYearId,
      name: `Term ${sequence}`,
      startsOn: null,
      endsOn: null,
      sequence,
      isCurrent: sequence === 1 && !configuredTerms.some((item) => item.isCurrent),
    };
    await db.insert(terms).values(term);
    termsBySequence.set(sequence, term);
  }

  return [1, 2, 3].map((sequence) => {
    const term = termsBySequence.get(sequence);
    if (!term) {
      throw new Error(`Term ${sequence} could not be initialized.`);
    }
    return term;
  });
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
