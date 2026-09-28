import { z } from "zod";
import { requiredText } from "./required-text";

export const wardRecordSchema = z.object({
  wardName: requiredText("Ward name"),
  wardCode: requiredText("Ward code").regex(
    /^\d{4}$/,
    "Ward code must be 4 digits",
  ),
  county: z.literal("Kilifi"),
  countyCode: requiredText("County code").regex(
    /^\d{3}$/,
    "County code must be 3 digits",
  ),
  subCounty: z.literal("Rabai"),
  subCountyCode: requiredText("Sub-County code").regex(
    /^\d{3}$/,
    "Sub-County code must be 3 digits",
  ),
  constituency: z.literal("Rabai"),
  constituencyCode: requiredText("Constituency code").regex(
    /^\d{3}$/,
    "Constituency code must be 3 digits",
  ),
});
