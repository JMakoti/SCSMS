import { z } from "zod";
import { requiredText } from "./required-text";

export const subjectCombinationSchema = z.object({
  schoolId: requiredText("School"),
  academicYearId: requiredText("Academic year"),
  code: requiredText("Subject code"),
  combination: requiredText("Subject combination"),
  pathway: requiredText("Pathway"),
  track: requiredText("Track"),
});
