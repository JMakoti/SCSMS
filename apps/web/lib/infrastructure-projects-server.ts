import { and, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@scsms/db/postgres";
import {
  academicYears,
  infrastructureProjects,
  schools,
  terms,
} from "@scsms/db/postgress-schemas/index";
import type { InfrastructureProjectFormValues } from "@scsms/features/types/forms";
import { writeSchoolAudit } from "./school-audit-server";

type InfrastructureProjectStatus =
  (typeof infrastructureProjects.$inferSelect)["status"];

const projectStatuses: Record<string, NonNullable<InfrastructureProjectStatus>> = {
  planned: "planned",
  pending: "planned",
  active: "planned",
  ongoing: "in_progress",
  "in progress": "in_progress",
  in_progress: "in_progress",
  completed: "completed",
  delayed: "deferred",
  deferred: "deferred",
  cancelled: "cancelled",
};

function required(value: string | null | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} is required.`);
  }

  return normalized;
}

function optional(value: string | number | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function optionalNumber(
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

function mapProjectStatus(status: string) {
  const normalized = status.trim().toLowerCase();
  const mapped = projectStatuses[normalized];
  if (!mapped) {
    throw new Error(`Unsupported infrastructure project status "${status}".`);
  }

  return mapped;
}

async function resolveSchoolId(schoolNameOrId: string | null | undefined) {
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
    throw new Error(`School "${value}" was not found in the registry.`);
  }

  return schoolByName.id;
}

async function resolveAcademicYearId(
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

async function resolveTermId(
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

export async function getInfrastructureProject(projectId: string) {
  const [project] = await db
    .select()
    .from(infrastructureProjects)
    .where(eq(infrastructureProjects.id, projectId))
    .limit(1);

  return project ?? null;
}

export async function createInfrastructureProjectRecord(
  input: InfrastructureProjectFormValues,
) {
  const projectId = randomUUID();
  const academicYearId = await resolveAcademicYearId(input.targetYear);
  const schoolId = await resolveSchoolId(input.selectedSchool);

  const values = {
    id: projectId,
    schoolId,
    academicYearId,
    termId: await resolveTermId(input.term, academicYearId),
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
  };
  await db.insert(infrastructureProjects).values(values);
  await writeSchoolAudit("created infrastructure project", schoolId, null, values);

  return projectId;
}

export async function updateInfrastructureProjectRecord(
  projectId: string,
  input: InfrastructureProjectFormValues,
) {
  const project = await getInfrastructureProject(projectId);
  if (!project) {
    throw new Error(
      "This infrastructure project no longer exists. Refresh the list and try again.",
    );
  }

  const academicYearId = await resolveAcademicYearId(input.targetYear);
  const schoolId = await resolveSchoolId(input.selectedSchool);
  const updates = {
    schoolId,
    academicYearId,
    termId: await resolveTermId(input.term, academicYearId),
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
    updatedAt: new Date(),
  };
  await db
    .update(infrastructureProjects)
    .set(updates)
    .where(eq(infrastructureProjects.id, projectId));
  await writeSchoolAudit("updated infrastructure project", schoolId, project, {
    ...project,
    ...updates,
  });
}

export async function deleteInfrastructureProjectRecord(projectId: string) {
  const project = await getInfrastructureProject(projectId);
  if (!project) {
    throw new Error(
      "This infrastructure project no longer exists. Refresh the list and try again.",
    );
  }

  await db
    .delete(infrastructureProjects)
    .where(eq(infrastructureProjects.id, projectId));
  await writeSchoolAudit(
    "deleted infrastructure project",
    project.schoolId,
    project,
    null,
  );
}
