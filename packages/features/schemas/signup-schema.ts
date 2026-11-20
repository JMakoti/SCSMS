import { z } from "zod";
export const signupSchema = z.object({
  name: z.string().trim().min(1).max(200),
  email: z.string().trim().email().max(320).transform((value) => value.toLowerCase()),
  phone: z.string().trim().max(40),
  password: z.string().min(8).refine((value) => new TextEncoder().encode(value).length <= 72),
  knecCode: z.string().trim().regex(/^[0-9]{1,20}$/, "Enter a valid KNEC code."),
  subcountyId: z.string().min(1).max(36),
});
