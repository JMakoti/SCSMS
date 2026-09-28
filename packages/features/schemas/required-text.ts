import { z } from "zod";

export function requiredText(label: string) {
  return z.string().trim().min(1, `${label} is required`);
}
