import type { RabaiSchool } from "../types/enterprise";

export type SchoolClassification =
  "Regular" | "Intergrated" | "Special_Needs" | "Comprehensive";

export type SchoolRegistrationStatus =
  "REGISTERED" | "PENDING" | "SUSPENDED" | "CLOSED";

export type SchoolLevel = "Primary" | "Junior_Secondary" | "Senior_School";

export type SchoolOwnership =
  "Goverment" | "Private" | "Community" | "NGO/Organization";

export const schoolClassificationOptions = [
  { label: "Regular", value: "Regular" },
  { label: "Intergrated", value: "Intergrated" },
  { label: "Special Needs", value: "Special_Needs" },
  { label: "Comprehensive", value: "Comprehensive" },
] as const;

export const schoolRegistrationStatusOptions = [
  { label: "Registered", value: "REGISTERED" },
  { label: "Pending", value: "PENDING" },
  { label: "Suspended", value: "SUSPENDED" },
  { label: "Closed", value: "CLOSED" },
] as const;

export const schoolLevelOptions = [
  { label: "Primary", value: "Primary" },
  { label: "Junior Secondary", value: "Junior_Secondary" },
  { label: "Senior School", value: "Senior_School" },
] as const;

export const schoolOwnershipOptions = [
  { label: "Goverment", value: "Goverment" },
  { label: "Private", value: "Private" },
  { label: "Community", value: "Community" },
  { label: "NGO/Organization", value: "NGO/Organization" },
] as const;

export const schoolGenderOptions = [
  { label: "Mixed", value: "MIXED" },
  { label: "Boys", value: "BOYS" },
  { label: "Girls", value: "GIRLS" },
] as const;

export const schoolBoardingOptions = [
  { label: "Day", value: "DAY" },
  { label: "Boarding", value: "BOARDING" },
  { label: "Day and boarding", value: "DAY_AND_BOARDING" },
] as const;

export const schoolTitleDeedOptions = [
  { label: "No", value: "NO" },
  { label: "Yes", value: "YES" },
] as const;

function labelFromOptions(
  options: readonly { label: string; value: string }[],
  value: string,
) {
  return options.find((option) => option.value === value)?.label ?? value;
}

export function getSchoolLevel(school: RabaiSchool): SchoolLevel {
  if (school.institutionType === "JUNIOR_SECONDARY") return "Junior_Secondary";
  if (school.institutionType === "SENIOR_SECONDARY") return "Senior_School";
  return "Primary";
}

export function getSchoolClassification(
  school: RabaiSchool,
): SchoolClassification {
  if (school.sne === "YES") return "Special_Needs";
  if (school.institutionType === "INTEGRATED") return "Intergrated";
  return "Regular";
}

export function getSchoolRegistrationStatus(
  school: RabaiSchool,
): SchoolRegistrationStatus {
  return school.isActive ? "REGISTERED" : "CLOSED";
}

export function getSchoolOwnership(school: RabaiSchool): SchoolOwnership {
  if (school.ownershipType === "PRIVATE") return "Private";
  if (school.ownershipType === "FAITH_BASED") return "NGO/Organization";
  return "Goverment";
}

export function getSchoolTitleDeed() {
  return "NO" as const;
}

export function formatSchoolClassification(value: string) {
  return labelFromOptions(schoolClassificationOptions, value);
}

export function formatSchoolRegistrationStatus(value: string) {
  return labelFromOptions(schoolRegistrationStatusOptions, value);
}

export function formatSchoolLevel(value: string) {
  return labelFromOptions(schoolLevelOptions, value);
}

export function formatSchoolOwnership(value: string) {
  return labelFromOptions(schoolOwnershipOptions, value);
}

export function formatSchoolGender(value: string) {
  return labelFromOptions(schoolGenderOptions, value);
}

export function formatSchoolBoarding(value: string) {
  return labelFromOptions(schoolBoardingOptions, value);
}

export function formatSchoolTitleDeed(value: string) {
  return labelFromOptions(schoolTitleDeedOptions, value);
}
