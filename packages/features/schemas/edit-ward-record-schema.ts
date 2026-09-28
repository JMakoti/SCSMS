import { z } from "zod";
import { wardRecordSchema } from "./ward-record-schema";

export const editWardRecordSchema = z.object({
  fields: wardRecordSchema,
});
