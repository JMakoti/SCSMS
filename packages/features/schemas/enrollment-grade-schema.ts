import { z } from "zod";

export const enrollmentGradeSaveSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  termId: z.string().min(1),
  grade: z.string().min(1),
  gradeBand: z.string().min(1),
  male: z.number().int().nonnegative(),
  female: z.number().int().nonnegative(),
});

export type EnrollmentGradeSaveInput = z.infer<
  typeof enrollmentGradeSaveSchema
>;
