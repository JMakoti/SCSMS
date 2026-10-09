import { asc, eq, or } from "drizzle-orm";
import type { InferInsertModel } from "drizzle-orm";

import { db } from "@/lib/database";
import {
  contacts,
  enrollmentSnapshots,
  infrastructureProjects,
  infrastructureSnapshots,
  auditLogs,
  performanceRecords,
  reportRuns,
  schools,
  staff,
  wards,
} from "@scsms/db";
import type {
  AddSchoolFormValues,
  EditSchoolRecordFormValues,
} from "@scsms/features/types/forms";
import { createLocalId } from "./helpers";
import { initializeSchoolEnrollment } from "./enrollment";
import { initializeSchoolInfrastructure } from "./infrastructure";

export type School = typeof schools.$inferSelect;
export type SchoolDetails = School & {
  ward: typeof wards.$inferSelect | null;
  contacts: Array<typeof contacts.$inferSelect>;
  staff: Array<typeof staff.$inferSelect>;
  enrollmentSnapshots: Array<typeof enrollmentSnapshots.$inferSelect>;
  infrastructureSnapshots: Array<typeof infrastructureSnapshots.$inferSelect>;
  infrastructureProjects: Array<typeof infrastructureProjects.$inferSelect>;
  performanceRecords: Array<typeof performanceRecords.$inferSelect>;
  reportRuns: Array<typeof reportRuns.$inferSelect>;
};

async function writeSchoolAudit(
  action: string,
  schoolId: string,
  before: unknown,
  after: unknown,
) {
  await db.insert(auditLogs).values({
    id: createLocalId(),
    action,
    entityType: "school",
    entityId: schoolId,
    beforeJson: before ? JSON.stringify(before) : null,
    afterJson: after ? JSON.stringify(after) : null,
  });
}

const institutionTypes: Record<
  AddSchoolFormValues["institutionType"],
  NonNullable<School["institutionType"]>
> = {
  Regular: "regular",
  Intergrated: "intergrated",
  Special_Needs: "special_needs",
  Comprehensive: "comprehensive",
};

const ownershipTypes: Record<
  AddSchoolFormValues["ownershipType"],
  NonNullable<School["ownershipType"]>
> = {
  Goverment: "goverment",
  Private: "private",
  Community: "community",
  "NGO/Organization": "NGO_organization",
};

const registrationStatuses: Record<
  NonNullable<AddSchoolFormValues["registrationStatus"]>,
  NonNullable<School["registrationstatus"]>
> = {
  REGISTERED: "registered",
  PENDING: "pending",
  SUSPENDED: "suspended",
  CLOSED: "closed",
};

const boardingTypes: Record<
  EditSchoolRecordFormValues["fields"]["boardingType"],
  NonNullable<School["boardingType"]> | null
> = {
  DAY: "day",
  BOARDING: "boarding",
  DAY_AND_BOARDING: "day_and_boarding",
  UNKNOWN: null,
};

const genderTypes: Record<
  EditSchoolRecordFormValues["fields"]["genderType"],
  NonNullable<School["genderType"]>
> = {
  MIXED: "mixed",
  BOYS: "boys",
  GIRLS: "girls",
  UNKNOWN: "unknown",
};

const sneStatuses: Record<
  AddSchoolFormValues["sne"],
  NonNullable<School["sne"]>
> = {
  YES: "yes",
  NO: "no",
  UNKNOWN: "unknown",
};

function required(value: string | undefined, label: string) {
  const normalized = value?.trim();
  if (!normalized) {
    throw new Error(`${label} is required to save a school record.`);
  }
  return normalized;
}

function optional(value: string | undefined) {
  return value?.trim() || null;
}

function parseCoordinate(value: string | undefined, label: string) {
  const normalized = optional(value);
  if (normalized === null) return null;

  const coordinate = Number(normalized);
  if (!Number.isFinite(coordinate)) {
    throw new Error(`${label} must be a valid number.`);
  }

  return coordinate;
}

function mapSchoolFields(
  fields: AddSchoolFormValues | EditSchoolRecordFormValues["fields"],
): Omit<InferInsertModel<typeof schools>, "wardId"> {
  return {
    schoolCode: required(fields.schoolCode, "School code"),
    uicCode: required(fields.uicCode, "UIC code"),
    knecCode: optional(fields.knecCode),
    tscCode: optional(fields.tscCode),
    registrationNumber: optional(fields.regNumber),
    officialName: required(fields.officialName, "Official school name"),
    displayName: required(fields.displayName, "Display name"),
    institutionType: institutionTypes[fields.institutionType],
    level: fields.level === "Primary"
      ? "primary"
      : fields.level === "Junior_Secondary"
        ? "junior"
        : "senior",
    ownershipType: ownershipTypes[fields.ownershipType],
    status: fields.isActive === "Active" ? "active" : "inactive",
    registrationstatus: fields.registrationStatus
      ? registrationStatuses[fields.registrationStatus]
      : null,
    boardingType: boardingTypes[fields.boardingType],
    genderType: genderTypes[fields.genderType],
    titleDeed: fields.titleDeed === "YES" ? "yes" : "no",
    latitude: parseCoordinate(fields.latitude, "Latitude"),
    longitude: parseCoordinate(fields.longitude, "Longitude"),
    location: optional(fields.location),
    address: optional(fields.address),
    phone: optional(fields.phone),
    email: optional(fields.email),
    sne: sneStatuses[fields.sne],
  };
}

async function resolveWardId(wardIdOrName: string | undefined) {
  const value = required(wardIdOrName, "Ward");
  const [record] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(or(eq(wards.id, value), eq(wards.wardName, value)))
    .limit(1);

  if (!record) {
    throw new Error(`Ward "${value}" was not found. Add the ward before assigning a school.`);
  }

  return record.id;
}

export async function listSchools() {
  return db.select().from(schools).orderBy(asc(schools.displayName));
}

export async function getSchool(id: string) {
  const [school] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);

  return school ?? null;
}

export async function getSchoolDetails(id: string) {
  const school = await getSchool(id);
  if (!school) return null;

  const [
    [ward],
    schoolContacts,
    schoolStaff,
    schoolEnrollmentSnapshots,
    schoolInfrastructureSnapshots,
    schoolInfrastructureProjects,
    schoolPerformanceRecords,
    schoolReportRuns,
  ] = await Promise.all([
    db.select().from(wards).where(eq(wards.id, school.wardId)).limit(1),
    db.select().from(contacts).where(eq(contacts.schoolId, id)).orderBy(asc(contacts.name)),
    db.select().from(staff).where(eq(staff.schoolId, id)).orderBy(asc(staff.lastName)),
    db
      .select()
      .from(enrollmentSnapshots)
      .where(eq(enrollmentSnapshots.schoolId, id))
      .orderBy(asc(enrollmentSnapshots.capturedAt)),
    db
      .select()
      .from(infrastructureSnapshots)
      .where(eq(infrastructureSnapshots.schoolId, id))
      .orderBy(asc(infrastructureSnapshots.capturedAt)),
    db
      .select()
      .from(infrastructureProjects)
      .where(eq(infrastructureProjects.schoolId, id))
      .orderBy(asc(infrastructureProjects.projectName)),
    db
      .select()
      .from(performanceRecords)
      .where(eq(performanceRecords.schoolId, id))
      .orderBy(asc(performanceRecords.assessmentName)),
    db
      .select()
      .from(reportRuns)
      .where(eq(reportRuns.schoolId, id))
      .orderBy(asc(reportRuns.generatedAt)),
  ]);

  return {
    ...school,
    ward: ward ?? null,
    contacts: schoolContacts,
    staff: schoolStaff,
    enrollmentSnapshots: schoolEnrollmentSnapshots,
    infrastructureSnapshots: schoolInfrastructureSnapshots,
    infrastructureProjects: schoolInfrastructureProjects,
    performanceRecords: schoolPerformanceRecords,
    reportRuns: schoolReportRuns,
  } satisfies SchoolDetails;
}

export async function createSchool(input: AddSchoolFormValues) {
  const schoolCode = required(input.schoolCode, "School code");
  const uicCode = required(input.uicCode, "UIC code");
  const [duplicateSchoolCode, duplicateUicCode] = await Promise.all([
    db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.schoolCode, schoolCode))
      .limit(1),
    db
      .select({ id: schools.id })
      .from(schools)
      .where(eq(schools.uicCode, uicCode))
      .limit(1),
  ]);

  if (duplicateSchoolCode.length > 0) {
    throw new Error(`School code ${schoolCode} is already in use.`);
  }
  if (duplicateUicCode.length > 0) {
    throw new Error(`UIC code ${uicCode} is already in use.`);
  }

  const wardId = await resolveWardId(input.ward);
  const schoolId = createLocalId();
  await db.insert(schools).values({
    id: schoolId,
    ...mapSchoolFields(input),
    logoPath: optional(input.filePath),
    wardId,
  });

  try {
    await initializeSchoolEnrollment(schoolId, input.level);
    await initializeSchoolInfrastructure(schoolId);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Unknown initial record creation error.";
    try {
      await db.delete(schools).where(eq(schools.id, schoolId));
    } catch (cleanupError) {
      const cleanupMessage =
        cleanupError instanceof Error
          ? cleanupError.message
          : "Unknown cleanup error.";
      throw new Error(
        `The school was created, but its initial records could not be created: ${message}. School rollback also failed: ${cleanupMessage}`,
      );
    }
    throw new Error(
      `The school was not saved because its initial records could not be created: ${message}`,
    );
  }
  await writeSchoolAudit("created school", schoolId, null, {
    id: schoolId,
    ...mapSchoolFields(input),
    wardId,
  });
}

export async function updateSchool(id: string, input: EditSchoolRecordFormValues) {
  const fields = input.fields;
  const schoolCode = required(fields.schoolCode, "School code");
  const [existing] = await db
    .select()
    .from(schools)
    .where(eq(schools.id, id))
    .limit(1);

  if (!existing) {
    throw new Error("This school no longer exists. Refresh the list and try again.");
  }

  const duplicate = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.schoolCode, schoolCode))
    .limit(1);

  if (duplicate.some((school) => school.id !== id)) {
    throw new Error(`School code ${schoolCode} is already in use.`);
  }
  const uicCode = required(fields.uicCode, "UIC code");
  const duplicateUicCode = await db
    .select({ id: schools.id })
    .from(schools)
    .where(eq(schools.uicCode, uicCode))
    .limit(1);

  if (duplicateUicCode.some((school) => school.id !== id)) {
    throw new Error(`UIC code ${uicCode} is already in use.`);
  }

  const wardId = await resolveWardId(fields.ward);
  const nextValues = {
    ...mapSchoolFields(fields),
    logoPath: optional(fields.filePath),
    wardId,
    updatedAt: new Date().toISOString(),
  };
  await db
    .update(schools)
    .set(nextValues)
    .where(eq(schools.id, id));
  await writeSchoolAudit("updated school", id, existing, {
    ...existing,
    ...nextValues,
  });
}

export async function updateSchoolLogoPath(id: string, logoPath: string) {
  const existing = await getSchool(id);
  if (!existing) {
    throw new Error("This school no longer exists. Refresh the list and try again.");
  }

  await db
    .update(schools)
    .set({ logoPath, updatedAt: new Date().toISOString() })
    .where(eq(schools.id, id));
  await writeSchoolAudit("updated school logo", id, existing, {
    ...existing,
    logoPath,
  });
}

export async function deleteSchool(id: string) {
  const existing = await getSchool(id);
  if (!existing) {
    throw new Error("This school no longer exists. Refresh the list and try again.");
  }

  await db.delete(schools).where(eq(schools.id, id));
  await writeSchoolAudit("deleted school", id, existing, null);
}
