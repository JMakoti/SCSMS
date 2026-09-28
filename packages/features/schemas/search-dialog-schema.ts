import { z } from "zod";

export const searchDialogSchema = z.object({
  query: z.string().trim(),
});
