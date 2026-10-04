import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  infrastructureFacilityRows,
  infrastructureProjects,
  infrastructureSnapshots,
  schools,
} from "@scsms/db";
import type { InfrastructureProjectFormValues } from "@scsms/features/types/forms";

import {
  createLocalId,
  optional,
  optionalNumber,
  required,
  resolveAcademicYearId,
  resolveSchoolId,
} from "./helpers";

export type InfrastructureProject = typeof infrastructureProjects.$inferSelect;
export type InfrastructureSnapshot = typeof infrastructureSnapshots.$inferSelect;
export type InfrastructureFacilityRow =
  typeof infrastructureFacilityRows.$inferSelect;
export type InfrastructureProjectDetails = InfrastructureProject & {
  school: typeof schools.$inferSelect | null;
  academicYear: typeof academicYears.$inferSelect | null;
};
export type InfrastructureSnapshotDetails = InfrastructureSnapshot & {
  school: typeof schools.$inferSelect | null;
  academicYear: typeof academicYears.$inferSelect | null;
  facilities: InfrastructureFacilityRow[];
};

export type CreateInfrastructureSnapshotInput = {
  school: string;
  academicYear: string | number;
  status?: InfrastructureSnapshot["status"];
  notes?: string;
  facilities?: Array<{
    facilityType: string;
    available?: number;
    good?: number;
    needsRepair?: number;
    status?: InfrastructureFacilityRow["status"];
    notes?: string;
  }>;
};

const projectStatuses: Record<string, NonNullable<InfrastructureProject["status"]>> = {
  planned: "planned",
  pending: "planned",
  "in progress": "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  deferred: "deferred",
  cancelled: "cancelled",
};

function mapProjectStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  const mapped = projectStatuses[normalized];
  if (!mapped) {
    throw new Error(`Unsupported infrastructure project status "${status}".`);
  }

  return mapped;
}

export async function listInfrastructureProjects() {
  return db
    .select()
    .from(infrastructureProjects)
    .orderBy(asc(infrastructureProjects.projectName));
}

export async function getInfrastructureProject(id: string) {
  const [project] = await db
    .select()
    .from(infrastructureProjects)
    .where(eq(infrastructureProjects.id, id))
    .limit(1);

  return project ?? null;
}

export async function getInfrastructureProjectDetails(id: string) {
  const project = await getInfrastructureProject(id);
  if (!project) return null;

  const [[school], [academicYear]] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, project.schoolId)).limit(1),
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, project.academicYearId))
      .limit(1),
  ]);

  return {
    ...project,
    school: school ?? null,
    academicYear: academicYear ?? null,
  } satisfies InfrastructureProjectDetails;
}

export async function createInfrastructureProject(
  input: InfrastructureProjectFormValues,
) {
  await db.insert(infrastructureProjects).values({
    schoolId: await resolveSchoolId(input.selectedSchool),
    academicYearId: await resolveAcademicYearId(input.targetYear),
    projectName: required(input.projectName, "Project name"),
    projectType: required(input.category, "Project category"),
    projectContractor: required(input.contractor, "Contractor"),
    status: mapProjectStatus(input.status),
    projectConditions: required(
      input.infrastructureCondition,
      "Infrastructure condition",
    ),
    budgetAmount: optionalNumber(input.budget, "Budget"),
    startsOn: optional(input.dateStarted),
    completedOn: optional(input.dateCompleted),
    description: optional(input.description),
  });
}

export async function updateInfrastructureProject(
  id: string,
  input: InfrastructureProjectFormValues,
) {
  const existing = await getInfrastructureProject(id);
  if (!existing) {
    throw new Error(
      "This infrastructure project no longer exists. Refresh the list and try again.",
    );
  }

  await db
    .update(infrastructureProjects)
    .set({
      schoolId: await resolveSchoolId(input.selectedSchool),
      academicYearId: await resolveAcademicYearId(input.targetYear),
      projectName: required(input.projectName, "Project name"),
      projectType: required(input.category, "Project category"),
      projectContractor: required(input.contractor, "Contractor"),
      status: mapProjectStatus(input.status),
      projectConditions: required(
        input.infrastructureCondition,
        "Infrastructure condition",
      ),
      budgetAmount: optionalNumber(input.budget, "Budget"),
      startsOn: optional(input.dateStarted),
      completedOn: optional(input.dateCompleted),
      description: optional(input.description),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(infrastructureProjects.id, id));
}

export async function deleteInfrastructureProject(id: string) {
  const existing = await getInfrastructureProject(id);
  if (!existing) {
    throw new Error(
      "This infrastructure project no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(infrastructureProjects).where(eq(infrastructureProjects.id, id));
}

export async function listInfrastructureSnapshots() {
  return db
    .select()
    .from(infrastructureSnapshots)
    .orderBy(asc(infrastructureSnapshots.capturedAt));
}

export async function getInfrastructureSnapshot(id: string) {
  const [snapshot] = await db
    .select()
    .from(infrastructureSnapshots)
    .where(eq(infrastructureSnapshots.id, id))
    .limit(1);

  return snapshot ?? null;
}

export async function getInfrastructureSnapshotDetails(id: string) {
  const snapshot = await getInfrastructureSnapshot(id);
  if (!snapshot) return null;

  const [[school], [academicYear], facilities] = await Promise.all([
    db.select().from(schools).where(eq(schools.id, snapshot.schoolId)).limit(1),
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, snapshot.academicYearId))
      .limit(1),
    listInfrastructureFacilityRows(id),
  ]);

  return {
    ...snapshot,
    school: school ?? null,
    academicYear: academicYear ?? null,
    facilities,
  } satisfies InfrastructureSnapshotDetails;
}

export async function listInfrastructureFacilityRows(snapshotId: string) {
  return db
    .select()
    .from(infrastructureFacilityRows)
    .where(eq(infrastructureFacilityRows.snapshotId, snapshotId))
    .orderBy(asc(infrastructureFacilityRows.facilityType));
}

export async function createInfrastructureSnapshot(
  input: CreateInfrastructureSnapshotInput,
) {
  const snapshotId = createLocalId();

  await db.insert(infrastructureSnapshots).values({
    id: snapshotId,
    schoolId: await resolveSchoolId(input.school),
    academicYearId: await resolveAcademicYearId(input.academicYear),
    status: input.status ?? "draft",
    notes: optional(input.notes),
  });

  if (input.facilities?.length) {
    await db.insert(infrastructureFacilityRows).values(
      input.facilities.map((facility) => ({
        snapshotId,
        facilityType: required(facility.facilityType, "Facility type"),
        available: facility.available ?? 0,
        good: facility.good ?? 0,
        needsRepair: facility.needsRepair ?? 0,
        status: facility.status ?? "active",
        notes: optional(facility.notes),
      })),
    );
  }

  return snapshotId;
}
