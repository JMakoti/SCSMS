import { z } from "zod";

export const schoolLevelSchema = z.enum(["Primary", "Junior", "Secondary"]);
export const schoolLevelFilterSchema = z.enum([
  "All",
  "Primary",
  "Junior",
  "Secondary",
]);
export const schoolTypeSchema = z.enum(["Public", "Private"]);
export const schoolStatusSchema = z.enum(["Active", "Update needed"]);

export const schoolRecordSchema = z.object({
  code: z.string(),
  name: z.string(),
  level: schoolLevelSchema,
  type: schoolTypeSchema,
  ward: z.string(),
  status: schoolStatusSchema,
  students: z.number(),
  staff: z.number(),
  updated: z.string(),
  completeness: z.number(),
});

export const navItemSchema = z.tuple([z.string(), z.string()]);
export const navGroupSchema = z.object({
  label: z.string(),
  items: z.array(navItemSchema),
});

export const staffRecordSchema = z.object({
  name: z.string(),
  role: z.string(),
  type: z.enum(["Teaching", "Non-teaching"]),
  phone: z.string(),
  status: z.enum(["Active", "On leave","In Active"]),
});

export const contactMethodSchema = z.object({
  label: z.string(),
  phone: z.string(),
});

export const schoolContactGroupSchema = z.object({
  title: z.string(),
  person: z.object({
    name: z.string(),
    email: z.string().email(),
    contacts: z.array(contactMethodSchema),
  }),
});

export const infrastructureFacilityRowSchema = z.object({
  facility: z.string(),
  available: z.number(),
  good: z.number(),
  needsRepair: z.number(),
  status: z.enum(["Pending", "Active", "Completed", "Cancelled"]),
});

export const infrastructureProjectRecordSchema = z.object({
  name: z.string(),
  school: z.string(),
  year: z.string(),
  term: z.string(),
  status: z.enum(["Completed", "In progress"]),
  budget: z.string(),
  detail: z.string(),
});

export const dashboardWardBarSchema = z.object({
  label: z.string(),
  value: z.number(),
});

export const dashboardActivityIconSchema = z.enum([
  "Pencil",
  "Plus",
  "Users",
  "UserCog",
]);

export const dashboardRecentActivitySchema = z.object({
  icon: dashboardActivityIconSchema,
  title: z.string(),
  entity: z.string(),
  time: z.string(),
  tone: z.string(),
});

export const dashboardGenderDistributionSchema = z.object({
  label: z.enum(["Male", "Female"]),
  value: z.number(),
  tone: z.enum(["male", "female"]),
});

export const enrollmentSchoolTypeSchema = z.enum([
  "Primary",
  "Junior",
  "Senior / Secondary",
]);

export const enrollmentFilterTypeSchema = z.enum([
  "All schools",
  "Primary",
  "Junior",
  "Senior / Secondary",
]);

export const enrollmentGradeBandSchema = z.object({
  label: z.string(),
  grades: z.string(),
  count: z.string(),
  tone: z.string(),
});

export const enrollmentRowSchema = z.object({
  school: z.string(),
  type: enrollmentSchoolTypeSchema,
  total: z.number(),
  updated: z.string(),
});

export const gradeEnrollmentSchoolRowSchema = z.tuple([
  z.string(),
  z.number(),
  z.number(),
]);

export const enrollmentGradeRowSchema = z.tuple([
  z.string(),
  z.number(),
  z.number(),
  z.number(),
]);

export const profileDetailSchema = z.tuple([z.string(), z.string()]);

export const profileDefaultsSchema = z.object({
  email: z.string().email(),
  phone: z.string(),
  department: z.string(),
  location: z.string(),
});

export const schoolHistoryIconSchema = z.enum([
  "Pencil",
  "Building2",
  "UserCog",
  "Users",
]);

export const schoolHistoryActivitySchema = z.object({
  title: z.string(),
  detail: z.string(),
  time: z.string(),
  icon: schoolHistoryIconSchema,
});

export const schoolGenderDistributionSchema = z.object({
  label: z.enum(["Male", "Female"]),
  value: z.number(),
  tone: z.enum(["male", "female"]),
});

export const moduleIconSchema = z.enum([
  "BookOpen",
  "Building2",
  "ClipboardCheck",
  "FileBarChart2",
  "History",
  "MapPinned",
  "Settings",
  "Server",
  "UserCog",
  "Users",
]);

export const moduleSeederConfigSchema = z.object({
  icon: moduleIconSchema,
  desc: z.string(),
  action: z.string(),
  items: z.array(z.string()),
});

export const reportDetailSchema = z.object({
  key: z.string(),
  title: z.string(),
  code: z.string(),
  category: z.string(),
  owner: z.string(),
  reportingPeriod: z.string(),
  frequency: z.string(),
  recordsIncluded: z.string(),
  lastGenerated: z.string(),
  nextDue: z.string(),
  status: z.enum(["Ready for export", "Scheduled", "Draft", "Needs review"]),
  format: z.string(),
  dataSources: z.array(z.string()),
  sections: z.array(z.string()),
  filters: z.array(z.string()),
  metrics: z.array(z.string()),
  previewColumns: z.array(z.string()),
  visualizations: z.array(z.string()),
  distribution: z.string(),
  retention: z.string(),
  description: z.string(),
  projectTitle: z.string(),
  projectSubtitle: z.string(),
  executiveSummary: z.string(),
  architecture: z.array(z.string()),
  primaryGoal: z.string(),
  objectives: z.array(z.string()),
  scopeAreas: z.array(
    z.object({
      title: z.string(),
      items: z.array(z.string()),
    }),
  ),
  synchronization: z.object({
    schedule: z.string(),
    localStore: z.string(),
    onlineStore: z.string(),
    failureHandling: z.string(),
  }),
  controls: z.array(z.string()),
  risks: z.array(
    z.object({
      risk: z.string(),
      mitigation: z.string(),
    }),
  ),
  successCriteria: z.array(z.string()),
});
