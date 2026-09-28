import type { z } from "zod";
import type {
  contactMethodSchema,
  dashboardActivityIconSchema,
  dashboardGenderDistributionSchema,
  dashboardRecentActivitySchema,
  dashboardWardBarSchema,
  enrollmentFilterTypeSchema,
  enrollmentGradeBandSchema,
  enrollmentGradeRowSchema,
  enrollmentRowSchema,
  enrollmentSchoolTypeSchema,
  gradeEnrollmentSchoolRowSchema,
  infrastructureFacilityRowSchema,
  infrastructureProjectRecordSchema,
  moduleIconSchema,
  moduleSeederConfigSchema,
  navGroupSchema,
  profileDefaultsSchema,
  reportDetailSchema,
  schoolContactGroupSchema,
  schoolGenderDistributionSchema,
  schoolHistoryActivitySchema,
  schoolHistoryIconSchema,
  schoolLevelFilterSchema,
  schoolLevelSchema,
  schoolRecordSchema,
  schoolStatusSchema,
  schoolTypeSchema,
  staffRecordSchema,
} from "../schemas/seeders";

export type SchoolLevel = z.infer<typeof schoolLevelSchema>;
export type SchoolLevelFilter = z.infer<typeof schoolLevelFilterSchema>;
export type SchoolType = z.infer<typeof schoolTypeSchema>;
export type SchoolStatus = z.infer<typeof schoolStatusSchema>;
export type SchoolRecord = z.infer<typeof schoolRecordSchema>;
export type NavGroup = z.infer<typeof navGroupSchema>;

export type StaffRecord = z.infer<typeof staffRecordSchema>;
export type ContactMethod = z.infer<typeof contactMethodSchema>;
export type SchoolContactGroup = z.infer<typeof schoolContactGroupSchema>;

export type InfrastructureFacilityRow = z.infer<
  typeof infrastructureFacilityRowSchema
>;
export type InfrastructureProjectRecord = z.infer<
  typeof infrastructureProjectRecordSchema
>;

export type DashboardWardBar = z.infer<typeof dashboardWardBarSchema>;
export type DashboardActivityIcon = z.infer<typeof dashboardActivityIconSchema>;
export type DashboardRecentActivity = z.infer<
  typeof dashboardRecentActivitySchema
>;
export type DashboardGenderDistribution = z.infer<
  typeof dashboardGenderDistributionSchema
>;

export type EnrollmentSchoolType = z.infer<typeof enrollmentSchoolTypeSchema>;
export type EnrollmentFilterType = z.infer<typeof enrollmentFilterTypeSchema>;
export type EnrollmentGradeBand = z.infer<typeof enrollmentGradeBandSchema>;
export type EnrollmentRow = z.infer<typeof enrollmentRowSchema>;
export type GradeEnrollmentSchoolRow = z.infer<
  typeof gradeEnrollmentSchoolRowSchema
>;
export type EnrollmentGradeRow = z.infer<typeof enrollmentGradeRowSchema>;

export type ProfileDefaults = z.infer<typeof profileDefaultsSchema>;
export type ProfileDetail = [string, keyof ProfileDefaults];
export type SchoolHistoryIcon = z.infer<typeof schoolHistoryIconSchema>;
export type SchoolHistoryActivity = z.infer<typeof schoolHistoryActivitySchema>;
export type SchoolGenderDistribution = z.infer<
  typeof schoolGenderDistributionSchema
>;

export type ModuleIcon = z.infer<typeof moduleIconSchema>;
export type ModuleSeederConfig = z.infer<typeof moduleSeederConfigSchema>;
export type ReportDetail = z.infer<typeof reportDetailSchema>;
