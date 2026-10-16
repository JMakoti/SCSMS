import { z } from "zod";

export const profileSchema = z.object({
  name: z.string().trim().min(1, "Enter your full name").max(200),
  email: z.string().trim().toLowerCase().email("Enter a valid email address").max(320),
  phone: z.string().trim().max(40, "Phone number is too long"),
  subcountyId: z.string().max(36),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password").max(1024),
  newPassword: z.string().refine((value) => [...value].length >= 8, "Use at least 8 characters").refine(
    (value) => new TextEncoder().encode(value).length <= 72,
    "Password is too long (maximum 72 bytes)",
  ),
  confirmPassword: z.string().min(1, "Confirm your new password"),
}).refine((values) => values.newPassword === values.confirmPassword, {
  message: "Passwords do not match", path: ["confirmPassword"],
}).refine((values) => values.newPassword !== values.currentPassword, {
  message: "Choose a different password", path: ["newPassword"],
});

export type ProfileFormValues = z.infer<typeof profileSchema>;
export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;
