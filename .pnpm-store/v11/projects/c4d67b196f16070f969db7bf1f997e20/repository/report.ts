import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  academicYears,
  reportRuns,
  reportTemplates,
  schools,
  terms,
  users,
} from "@scsms/db";

import {
  optional,
  optionalInteger,
  required,
  resolveAcademicYearId,
  resolveSchoolId,
  resolveTermId,
} from "./helpers";

export type ReportTemplate = typeof reportTemplates.$inferSelect;
export type ReportRun = typeof reportRuns.$inferSelect;
export type ReportTemplateDetails = ReportTemplate & {
  runs: ReportRun[];
};
export type ReportRunDetails = ReportRun & {
  template: ReportTemplate | null;
  academicYear: typeof academicYears.$inferSelect | null;
  term: typeof terms.$inferSelect | null;
  school: typeof schools.$inferSelect | null;
  generatedBy: Pick<
    typeof users.$inferSelect,
    "id" | "name" | "email" | "phone" | "status"
  > | null;
};

export type ReportTemplateInput = {
  key: string;
  code: string;
  title: string;
  category: string;
  description?: string;
  frequency: ReportTemplate["frequency"];
  defaultFormat?: ReportTemplate["defaultFormat"];
  isActive?: boolean;
};

export type ReportRunInput = {
  template: string;
  academicYear: string | number;
  term?: string;
  school?: string;
  generatedByUserId?: string;
  status?: ReportRun["status"];
  format?: ReportRun["format"];
  filters?: unknown;
  filePath?: string;
  recordsIncluded?: number | string;
  exportedAt?: string;
  notes?: string;
};

export async function listReportTemplates() {
  return db
    .select()
    .from(reportTemplates)
    .orderBy(asc(reportTemplates.category), asc(reportTemplates.title));
}

export async function getReportTemplate(id: string) {
  const [template] = await db
    .select()
    .from(reportTemplates)
    .where(eq(reportTemplates.id, id))
    .limit(1);

  return template ?? null;
}

export async function getReportTemplateDetails(id: string) {
  const template = await getReportTemplate(id);
  if (!template) return null;

  const runs = await db
    .select()
    .from(reportRuns)
    .where(eq(reportRuns.templateId, id))
    .orderBy(asc(reportRuns.generatedAt));

  return {
    ...template,
    runs,
  } satisfies ReportTemplateDetails;
}

export async function createReportTemplate(input: ReportTemplateInput) {
  const key = required(input.key, "Report key");
  const code = required(input.code, "Report code");
  await ensureTemplateIsUnique(key, code);

  await db.insert(reportTemplates).values({
    key,
    code,
    title: required(input.title, "Report title"),
    category: required(input.category, "Report category"),
    description: optional(input.description),
    frequency: input.frequency,
    defaultFormat: input.defaultFormat ?? "pdf_xlsx",
    isActive: input.isActive ?? true,
  });
}

export async function updateReportTemplate(
  id: string,
  input: ReportTemplateInput,
) {
  const existing = await getReportTemplate(id);
  if (!existing) {
    throw new Error(
      "This report template no longer exists. Refresh the list and try again.",
    );
  }

  const key = required(input.key, "Report key");
  const code = required(input.code, "Report code");
  await ensureTemplateIsUnique(key, code, id);

  await db
    .update(reportTemplates)
    .set({
      key,
      code,
      title: required(input.title, "Report title"),
      category: required(input.category, "Report category"),
      description: optional(input.description),
      frequency: input.frequency,
      defaultFormat: input.defaultFormat ?? existing.defaultFormat,
      isActive: input.isActive ?? existing.isActive,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(reportTemplates.id, id));
}

export async function deleteReportTemplate(id: string) {
  const existing = await getReportTemplate(id);
  if (!existing) {
    throw new Error(
      "This report template no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(reportTemplates).where(eq(reportTemplates.id, id));
}

export async function listReportRuns() {
  return db
    .select()
    .from(reportRuns)
    .orderBy(asc(reportRuns.generatedAt));
}

export async function getReportRun(id: string) {
  const [run] = await db
    .select()
    .from(reportRuns)
    .where(eq(reportRuns.id, id))
    .limit(1);

  return run ?? null;
}

export async function getReportRunDetails(id: string) {
  const run = await getReportRun(id);
  if (!run) return null;

  const [
    [template],
    [academicYear],
    termResult,
    schoolResult,
    generatedByResult,
  ] = await Promise.all([
    db
      .select()
      .from(reportTemplates)
      .where(eq(reportTemplates.id, run.templateId))
      .limit(1),
    db
      .select()
      .from(academicYears)
      .where(eq(academicYears.id, run.academicYearId))
      .limit(1),
    run.termId
      ? db.select().from(terms).where(eq(terms.id, run.termId)).limit(1)
      : Promise.resolve([]),
    run.schoolId
      ? db.select().from(schools).where(eq(schools.id, run.schoolId)).limit(1)
      : Promise.resolve([]),
    run.generatedByUserId
      ? db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          status: users.status,
        })
        .from(users)
        .where(eq(users.id, run.generatedByUserId))
        .limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...run,
    template: template ?? null,
    academicYear: academicYear ?? null,
    term: termResult[0] ?? null,
    school: schoolResult[0] ?? null,
    generatedBy: generatedByResult[0] ?? null,
  } satisfies ReportRunDetails;
}

export async function createReportRun(input: ReportRunInput) {
  const templateId = await resolveReportTemplateId(input.template);
  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db.insert(reportRuns).values({
    templateId,
    academicYearId,
    termId: await resolveTermId(input.term, academicYearId),
    schoolId: input.school ? await resolveSchoolId(input.school) : null,
    generatedByUserId: optional(input.generatedByUserId),
    status: input.status ?? "queued",
    format: input.format ?? "pdf_xlsx",
    filtersJson: stringifyFilters(input.filters),
    filePath: optional(input.filePath),
    recordsIncluded: optionalInteger(input.recordsIncluded, "Records included") ?? 0,
    exportedAt: optional(input.exportedAt),
    notes: optional(input.notes),
  });
}

export async function updateReportRun(id: string, input: ReportRunInput) {
  const existing = await getReportRun(id);
  if (!existing) {
    throw new Error(
      "This report run no longer exists. Refresh the list and try again.",
    );
  }

  const templateId = await resolveReportTemplateId(input.template);
  const academicYearId = await resolveAcademicYearId(input.academicYear);

  await db
    .update(reportRuns)
    .set({
      templateId,
      academicYearId,
      termId: await resolveTermId(input.term, academicYearId),
      schoolId: input.school ? await resolveSchoolId(input.school) : existing.schoolId,
      generatedByUserId:
        input.generatedByUserId !== undefined
          ? optional(input.generatedByUserId)
          : existing.generatedByUserId,
      status: input.status ?? existing.status,
      format: input.format ?? existing.format,
      filtersJson:
        input.filters !== undefined ? stringifyFilters(input.filters) : existing.filtersJson,
      filePath: input.filePath !== undefined ? optional(input.filePath) : existing.filePath,
      recordsIncluded:
        optionalInteger(input.recordsIncluded, "Records included") ??
        existing.recordsIncluded,
      exportedAt:
        input.exportedAt !== undefined ? optional(input.exportedAt) : existing.exportedAt,
      notes: input.notes !== undefined ? optional(input.notes) : existing.notes,
    })
    .where(eq(reportRuns.id, id));
}

export async function deleteReportRun(id: string) {
  const existing = await getReportRun(id);
  if (!existing) {
    throw new Error(
      "This report run no longer exists. Refresh the list and try again.",
    );
  }

  await db.delete(reportRuns).where(eq(reportRuns.id, id));
}

async function resolveReportTemplateId(templateKeyCodeOrId: string) {
  const value = required(templateKeyCodeOrId, "Report template");
  const [template] = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(eq(reportTemplates.id, value))
    .limit(1);

  if (template) return template.id;

  const [templateByKey] = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(eq(reportTemplates.key, value))
    .limit(1);

  if (templateByKey) return templateByKey.id;

  const [templateByCode] = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(eq(reportTemplates.code, value))
    .limit(1);

  if (!templateByCode) {
    throw new Error(`Report template "${value}" was not found.`);
  }

  return templateByCode.id;
}

async function ensureTemplateIsUnique(
  key: string,
  code: string,
  currentId?: string,
) {
  const duplicateKeys = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(eq(reportTemplates.key, key))
    .limit(1);

  if (duplicateKeys.some((template) => template.id !== currentId)) {
    throw new Error(`Report key "${key}" is already in use.`);
  }

  const duplicateCodes = await db
    .select({ id: reportTemplates.id })
    .from(reportTemplates)
    .where(eq(reportTemplates.code, code))
    .limit(1);

  if (duplicateCodes.some((template) => template.id !== currentId)) {
    throw new Error(`Report code "${code}" is already in use.`);
  }
}

function stringifyFilters(filters: unknown) {
  if (filters === undefined || filters === null) return null;
  if (typeof filters === "string") return optional(filters);

  return JSON.stringify(filters);
}
