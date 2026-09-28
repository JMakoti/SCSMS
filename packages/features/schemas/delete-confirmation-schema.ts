import { z } from "zod";

export function createDeleteConfirmationSchema(confirmCode: string) {
  return z.object({
    confirmationCode: z
      .string()
      .trim()
      .refine((value) => value === confirmCode, "Confirmation code must match"),
  });
}
