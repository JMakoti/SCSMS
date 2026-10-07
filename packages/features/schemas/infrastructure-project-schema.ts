import { z } from "zod";
import { requiredText } from "./required-text";

export const infrastructureProjectSchema = z.object({
  projectName: requiredText("Project name"),
  selectedSchool: requiredText("Selected school"),
  category: requiredText("Project category"),
  status: requiredText("Project status"),
  term: requiredText("Term"),
  budget: z.string().trim().optional(),
  targetYear: z.number().min(2026, "Target year must be 2026 or later"),
  description: z.string().trim().optional(),
  contractor: requiredText("Contractor"),
  infrastructureCondition: requiredText("Infrastructure Condition"),
  dateStarted: z.string().trim().optional(),
  dateCompleted: z.string().trim().optional(),
});
