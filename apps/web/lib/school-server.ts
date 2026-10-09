import { eq, or } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db } from "@scsms/db/postgres";
import {
  academicYears,
  enrollmentGradeRows,
  enrollmentSnapshots,
  infrastructureFacilityRows,
  infrastructureSnapshots,
  schools,
  terms,
  wards,
} from "@scsms/db/postgress-schemas/index";
import type { AddSchoolFormValues } from "@scsms/features/types/forms";
import { writeSchoolAudit } from "./school-audit-server";

type School = typeof schools.$inferSelect;

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
  AddSchoolFormValues["boardingType"],
  NonNullable<School["boardingType"]>
> = {
  DAY: "day",
  BOARDING: "boarding",
  DAY_AND_BOARDING: "day_and_boarding",
};

const genderTypes: Record<
  AddSchoolFormValues["genderType"],
  NonNullable<School["genderType"]>
> = {
  MIXED: "mixed",
  BOYS: "boys",
  GIRLS: "male",
};

const sneStatuses: Record<
  AddSchoolFormValues["sne"],
  NonNullable<School["sne"]> | null
> = {
  YES: "yes",
  NO: "no",
  UNKNOWN: null,
};

const gradesBySchoolLevel: Record<
  AddSchoolFormValues["level"],
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

const defaultSchoolFacilities = [
  "Classrooms",
  "Administration block",
  "Staffroom",
  "Teachers' houses",
  "Library",
  "Laboratories",
  "Computer laboratory",
  "ICT room",
  "Kitchen",
  "Dining hall",
  "Assembly hall",
  "Store",
  "Washrooms",
  "Water points",
  "Borehole",
  "Water storage tanks",
  "Electricity connection",
  "Solar power system",
  "Sports field",
  "Security fence",
  "Main gate",
  "Garbage disposal area",
] as const;

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

function mapSchoolFields(input: AddSchoolFormValues) {
  return {
    schoolCode: required(input.schoolCode, "School code"),
    uicCode: required(input.uicCode, "UIC code"),
    knecCode: optional(input.knecCode),
    tscCode: optional(input.tscCode),
    registrationNumber: optional(input.regNumber),
    officialName: required(input.officialName, "Official school name"),
    displayName: required(input.displayName, "Display name"),
    institutionType: institutionTypes[input.institutionType],
    level:
      input.level === "Primary"
        ? "primary"
        : input.level === "Junior_Secondary"
          ? "junior"
          : "senior",
    ownershipType: ownershipTypes[input.ownershipType],
    clusterLevel: input.clusterLevel,
    status: input.isActive === "Active" ? "active" : "inactive",
    registrationstatus: input.registrationStatus
      ? registrationStatuses[input.registrationStatus]
      : null,
    boardingType: boardingTypes[input.boardingType],
    genderType: genderTypes[input.genderType],
    titleDeed: input.titleDeed === "YES" ? "yes" : "no",
    latitude: parseCoordinate(input.latitude, "Latitude"),
    longitude: parseCoordinate(input.longitude, "Longitude"),
    location: optional(input.location),
    address: optional(input.address),
    phone: optional(input.phone),
    email: optional(input.email),
    sne: sneStatuses[input.sne],
  } satisfies Omit<typeof schools.$inferInsert, "id" | "wardId">;
}

async function resolveWardId(wardIdOrName: string | undefined) {
  const value = required(wardIdOrName, "Ward");
  const [record] = await db
    .select({ id: wards.id })
    .from(wards)
    .where(or(eq(wards.id, value), eq(wards.wardName, value)))
    .limit(1);

  if (!record) {
    throw new Error(
      `Ward "${value}" was not found. Add the ward before assigning a school.`,
    );
  }

  return record.id;
}

async function resolveEnrollmentAcademicYear() {
  const [currentYear] = await db
    .select()
    .from(academicYears)
    .where(eq(academicYears.isCurrent, true))
    .limit(1);
  if (currentYear) return currentYear;

  const configuredYears = await db.select().from(academicYears);
  if (configuredYears[0]) {
    const year = configuredYears[0];
    await db
      .update(academicYears)
      .set({
        isCurrent: true,
        status: "active",
        updatedAt: new Date(),
      })
      .where(eq(academicYears.id, year.id));
    return { ...year, isCurrent: true, status: "active" as const };
  }

  const yearName = String(new Date().getFullYear());
  const yearId = randomUUID();
  const year = {
    id: yearId,
    name: yearName,
    startsOn: `${yearName}-01-01`,
    endsOn: `${yearName}-12-31`,
    status: "active" as const,
    isCurrent: true,
  };
  await db.insert(academicYears).values(year);
  return year;
}

async function ensureEnrollmentTerms(academicYearId: string) {
  const configuredTerms = await db
    .select()
    .from(terms)
    .where(eq(terms.academicYearId, academicYearId));
  const termsBySequence = new Map(
    configuredTerms.map((term) => [term.sequence, term]),
  );

  for (const sequence of [1, 2, 3]) {
    if (termsBySequence.has(sequence)) continue;

    const term = {
      id: randomUUID(),
      academicYearId,
      name: `Term ${sequence}`,
      startsOn: null,
      endsOn: null,
      sequence,
      isCurrent:
        sequence === 1 && !configuredTerms.some((item) => item.isCurrent),
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

async function initializeSchoolEnrollment(
  schoolId: string,
  schoolLevel: AddSchoolFormValues["level"],
) {
  const academicYear = await resolveEnrollmentAcademicYear();
  const yearTerms = await ensureEnrollmentTerms(academicYear.id);
  const grades = gradesBySchoolLevel[schoolLevel];
  const snapshotIds = yearTerms.map(() => randomUUID());

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
        id: randomUUID(),
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

async function initializeSchoolInfrastructure(schoolId: string) {
  const academicYear = await resolveEnrollmentAcademicYear();
  const snapshotId = randomUUID();

  await db.insert(infrastructureSnapshots).values({
    id: snapshotId,
    schoolId,
    academicYearId: academicYear.id,
    status: "draft",
  });
  await db.insert(infrastructureFacilityRows).values(
    defaultSchoolFacilities.map((facilityType) => ({
      id: randomUUID(),
      snapshotId,
      facilityType,
      available: 0,
      good: 0,
      needsRepair: 0,
      status: "pending" as const,
    })),
  );
}

export async function createSchoolRecord(input: AddSchoolFormValues) {
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
  const schoolId = randomUUID();
  const values = {
    id: schoolId,
    ...mapSchoolFields(input),
    wardId,
  };
  await db.insert(schools).values(values);

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

  await writeSchoolAudit("created school", schoolId, null, values);
}
