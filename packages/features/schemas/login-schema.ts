import { z } from "zod";
import { requiredText } from "./required-text";

export const loginSchema = z.object({
  email: z.string().trim().min(1, "Enter your email or username"),
  password: requiredText("Password"),
});
