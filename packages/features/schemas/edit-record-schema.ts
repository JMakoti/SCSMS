import { z } from "zod";

export const editRecordSchema = z.object({
  fields: z.record(z.string(), z.string().trim().optional()),
});
