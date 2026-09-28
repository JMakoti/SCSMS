import { z } from "zod";

export const schoolRegistryFilterSchema = z.object({
  query: z.string().trim(),
  filter: z.enum([
    "All",
    "PRIMARY",
    "JUNIOR_SECONDARY",
    "SENIOR_SECONDARY",
    "INTEGRATED",
  ]),
  rowsPerPage: z.union([z.literal(25), z.literal(50), z.literal(100)]),
});
