import { z } from "zod";
import { requiredText } from "./required-text";

export const profileSchema = z.object({
  email: z.string().trim().email("Enter a valid email address"),
  phone: requiredText("Phone number"),
  department: requiredText("Department"),
  location: requiredText("Location"),
});
