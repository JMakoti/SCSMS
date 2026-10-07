import { z } from "zod";
import { requiredText } from "./required-text";

export const wardRecordSchema = z.object({
  wardName: requiredText("Ward name"),
  wardCode: requiredText("Ward code").regex(
    /^\d{4}$/,
    "Ward code must be 4 digits",
  ),
  subCountyId: requiredText("Sub-County"),
  notes: z.string().trim().optional(),
});
