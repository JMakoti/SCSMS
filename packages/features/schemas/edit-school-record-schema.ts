import { z } from "zod";
import { requiredText } from "./required-text";

export const editSchoolRecordSchema = z.object({
  fields: z.object({
    schoolCode: requiredText("School code"),
    uicCode: requiredText("UIC code"),
    knecCode: z.string().trim().optional(),
    tscCode: z.string().trim().optional(),
    filePath: z.string().trim().optional(),
    regNumber: z.string().trim().optional(),
    officialName: requiredText("Official school name"),
    displayName: requiredText("Display name"),
    institutionType: z.enum([
      "Regular",
      "Intergrated",
      "Special_Needs",
      "Comprehensive",
    ]),
    sourceInstitutionType: z.string().trim().optional(),
    registrationStatus: z
      .enum(["REGISTERED", "PENDING", "SUSPENDED", "CLOSED"])
      .optional(),
    level: z.enum(["Primary", "Junior_Secondary", "Senior_School"]),
    ownershipType: z.enum([
      "Goverment",
      "Private",
      "Community",
      "NGO/Organization",
    ]),
    genderType: z.enum(["MIXED", "BOYS", "GIRLS", "UNKNOWN"]),
    boardingType: z.enum(["DAY", "BOARDING", "DAY_AND_BOARDING", "UNKNOWN"]),
    titleDeed: z.enum(["YES", "NO"]),
    county: z.literal("Kilifi"),
    subCounty: z.literal("Rabai"),
    ward: z.string().trim().optional(),
    location: z.string().trim().optional(),
    address: z.string().trim().optional(),
    phone: z.string().trim().optional(),
    email: z
      .string()
      .trim()
      .email("Enter a valid email address")
      .or(z.literal(""))
      .optional(),
    latitude: z.string().trim().optional(),
    longitude: z.string().trim().optional(),
    sne: z.enum(["YES", "NO", "UNKNOWN"]),
    isActive: z.enum(["Active", "Inactive"]),
    dataConfidence: z
      .enum(["VERIFIED", "PARTIAL", "SECONDARY_SOURCE"])
      .or(z.literal(""))
      .optional(),
  }),
});
