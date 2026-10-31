import type { FeatureData } from "./feature-data-context";
import type { RabaiSchool } from "../types/enterprise";

export type CompletenessGroup = {
  label: string;
  target: "Overview" | "Enrollment" | "Infrastructure";
  total: number;
  missing: string[];
};
export type SchoolCompleteness = {
  school: RabaiSchool;
  groups: CompletenessGroup[];
  completed: number;
  total: number;
  percent: number;
};

// Zero coordinates/counts and explicit NO values are recorded data, not omissions.
export function isRecorded(value: unknown): boolean {
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (typeof value !== "string") return false;
  return !["", "UNKNOWN", "NOT PROVIDED", "NOT RECORDED", "N/A"].includes(value.trim().toUpperCase());
}

export function schoolCompleteness(
  school: RabaiSchool, hasEnrollment: boolean, hasInfrastructure: boolean,
): SchoolCompleteness {
  const group = (label: string, target: CompletenessGroup["target"], fields: [string, unknown][]): CompletenessGroup => ({
    label, target, total: fields.length,
    missing: fields.filter(([, value]) => !isRecorded(value)).map(([name]) => name),
  });
  const groups = [
    group("Basic information", "Overview", [
      ["School code", school.schoolCode], ["Official name", school.officialName],
      ["Display name", school.displayName], ["Registration status", school.registrationStatus],
      ["Institution type", school.institutionType], ["Ownership", school.ownershipType],
      ["Gender", school.genderType], ["Boarding", school.boardingType],
      ["Title deed", school.titleDeed], ["SNE provision", school.sne],
    ]),
    group("Location and contacts", "Overview", [
      ["County", school.county], ["Sub-County", school.subCounty], ["Ward", school.ward],
      ["Location", school.location], ["Address", school.address],
      ["Phone", school.phone], ["Email", school.email],
      ["Latitude", school.latitude], ["Longitude", school.longitude],
    ]),
    group("Enrollment", "Enrollment", [["Enrollment by grade for the selected academic year", hasEnrollment ? true : null]]),
    group("Infrastructure", "Infrastructure", [["Facility records for the selected academic year", hasInfrastructure ? true : null]]),
  ];
  const total = groups.reduce((sum, item) => sum + item.total, 0);
  const completed = total - groups.reduce((sum, item) => sum + item.missing.length, 0);
  return { school, groups, completed, total, percent: Math.round(completed / total * 100) };
}

export function completenessReport(data: Pick<FeatureData, "schools" | "enrollmentRows" | "infrastructureFacilities">, academicYearId: string) {
  const enrolled = new Set(data.enrollmentRows.filter((row) => row.academicYearId === academicYearId).map((row) => row.schoolId));
  const facilities = new Set(data.infrastructureFacilities.filter((row) => row.academicYearId === academicYearId).map((row) => row.schoolId));
  const records = data.schools.map((school) => schoolCompleteness(school, enrolled.has(school.id), facilities.has(school.id)));
  const total = records.reduce((sum, record) => sum + record.total, 0);
  const completed = records.reduce((sum, record) => sum + record.completed, 0);
  const complete = records.filter((record) => record.completed === record.total).length;
  return { records, percent: total ? Math.round(completed / total * 100) : 0, complete, incomplete: records.length - complete };
}
