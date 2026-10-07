import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  enrollmentSnapshots,
  infrastructureProjects,
  infrastructureSnapshots,
  performanceRecords,
  reportRuns,
  terms,
} from "@scsms/db";

import { optional, required } from "./helpers";

export type AcademicYearRecord = typeof academicYears.$inferSelect;
export type AcademicYearDetails = AcademicYearRecord & {
  terms: Array<typeof terms.$inferSelect>;
  enrollmentSnapshots: Array<typeof enrollmentSnapshots.$inferSelect>;
  infrastructureSnapshots: Array<typeof infrastructureSnapshots.$inferSelect>;
  infrastructureProjects: Array<typeof infrastructureProjects.$inferSelect>;
  performanceRecords: Array<typeof performanceRecords.$inferSelect>;
  reportRuns: Array<typeof reportRuns.$inferSelect>;
};

export type AcademicYearInput = {
  id?: string;
  name: string;
  startsOn: string;
  endsOn: string;
  status?: AcademicYearRecord["status"];
  isCurrent?: boolean;
};

export async function listAcademicYears() {
  return db.select().from(academicYears).orderBy(asc(academicYears.name));
}

export async function getAcademicYear(id: string) {
  const [academicYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.id, id))
    .limit(1);

  return academicYear ?? null;
}

export async function getAcademicYearDetails(id: string) {
  const academicYear = await getAcademicYear(id);
  if (!academicYear) return null;

  const [
    yearTerms,
    yearEnrollmentSnapshots,
    yearInfrastructureSnapshots,
    yearInfrastructureProjects,
    yearPerformanceRecords,
    yearReportRuns,
  ] = await Promise.all([
    db
      .select()
      .from(terms)
      .where(eq(terms.academicYearId, id))
      .orderBy(asc(terms.sequence)),
    db
      .select()
      .from(enrollmentSnapshots)
      .where(eq(enrollmentSnapshots.academicYearId, id))
      .orderBy(asc(enrollmentSnapshots.capturedAt)),
    db
      .select()
      .from(infrastructureSnapshots)
      .where(eq(infrastructureSnapshots.academicYearId, id))
      .orderBy(asc(infrastructureSnapshots.capturedAt)),
    db
      .select()
      .from(infrastructureProjects)
      .where(eq(infrastructureProjects.academicYearId, id))
      .orderBy(asc(infrastructureProjects.projectName)),
    db
      .select()
      .from(performanceRecords)
      .where(eq(performanceRecords.academicYearId, id))
      .orderBy(asc(performanceRecords.assessmentName)),
    db
      .select()
      .from(reportRuns)
      .where(eq(reportRuns.academicYearId, id))
      .orderBy(asc(reportRuns.generatedAt)),
  ]);

  return {
    ...academicYear,
    terms: yearTerms,
    enrollmentSnapshots: yearEnrollmentSnapshots,
    infrastructureSnapshots: yearInfrastructureSnapshots,
    infrastructureProjects: yearInfrastructureProjects,
    performanceRecords: yearPerformanceRecords,
    reportRuns: yearReportRuns,
  } satisfies AcademicYearDetails;
}

export async function createAcademicYear(input: AcademicYearInput) {
  const name = required(input.name, "Academic year name");
  const duplicate = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.name, name))
    .limit(1);

  if (duplicate.length > 0) {
    throw new Error(`Academic year "${name}" is already configured.`);
  }

  if (input.isCurrent) {
    await clearCurrentAcademicYear();
  }

  await db.insert(academicYears).values({
    id: input.id,
    name,
    startsOn: required(input.startsOn, "Start date"),
    endsOn: required(input.endsOn, "End date"),
    status: input.status ?? (input.isCurrent ? "active" : "planned"),
    isCurrent: input.isCurrent ?? false,
  });

  return input.id ?? name;
}

export async function updateAcademicYear(id: string, input: AcademicYearInput) {
  const existing = await getAcademicYear(id);
  if (!existing) {
    throw new Error(
      "This academic year no longer exists. Refresh the list and try again.",
    );
  }

  const name = required(input.name, "Academic year name");
  const duplicate = await db
    .select({ id: academicYears.id })
    .from(academicYears)
    .where(eq(academicYears.name, name))
    .limit(1);

  if (duplicate.some((year) => year.id !== id)) {
    throw new Error(`Academic year "${name}" is already configured.`);
  }

  if (input.isCurrent) {
    await clearCurrentAcademicYear();
  }

  await db
    .update(academicYears)
    .set({
      name,
      startsOn: required(input.startsOn, "Start date"),
      endsOn: required(input.endsOn, "End date"),
      status: input.status ?? existing.status,
      isCurrent: input.isCurrent ?? existing.isCurrent,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(academicYears.id, id));
}

export async function setCurrentAcademicYear(id: string) {
  const existing = await getAcademicYear(id);
  if (!existing) {
    throw new Error(
      "This academic year no longer exists. Refresh the list and try again.",
    );
  }

  await clearCurrentAcademicYear();
  await db
    .update(academicYears)
    .set({
      isCurrent: true,
      status: "active",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(academicYears.id, id));
}

export async function closeAcademicYear(id: string) {
  const existing = await getAcademicYear(id);
  if (!existing) {
    throw new Error(
      "This academic year no longer exists. Refresh the list and try again.",
    );
  }

  await db
    .update(academicYears)
    .set({
      isCurrent: false,
      status: "closed",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(academicYears.id, id));
}

export async function deleteAcademicYear(id: string) {
  const existing = await getAcademicYear(id);
  if (!existing) {
    throw new Error(
      "This academic year no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(academicYears).where(eq(academicYears.id, id));
}

async function clearCurrentAcademicYear() {
  await db
    .update(academicYears)
    .set({ isCurrent: false, updatedAt: new Date().toISOString() });
}
