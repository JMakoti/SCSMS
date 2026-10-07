import { z } from "zod";

export const infrastructureFacilitySaveSchema = z.object({
  schoolId: z.string().min(1),
  academicYearId: z.string().min(1),
  previousFacility: z.string().min(1),
  facility: z.string().trim().min(1),
  available: z.number().int().nonnegative(),
  good: z.number().int().nonnegative(),
  needsRepair: z.number().int().nonnegative(),
  status: z.enum(["Pending", "Active", "Completed", "Needs repair", "Unavailable"]),
});

export type InfrastructureFacilitySaveInput = z.infer<
  typeof infrastructureFacilitySaveSchema
>;
