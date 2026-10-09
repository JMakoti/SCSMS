import type { z } from "zod";
import type { addContactSchema } from "../schemas/add-contact-schema";
import type { addSchoolSchema } from "../schemas/add-school-schema";
import type { addStaffSchema } from "../schemas/add-staff-schema";
import type { addWardSchema } from "../schemas/add-ward-schema";
import type { editRecordSchema } from "../schemas/edit-record-schema";
import type { editSchoolRecordSchema } from "../schemas/edit-school-record-schema";
import type { editWardRecordSchema } from "../schemas/edit-ward-record-schema";
import type { infrastructureProjectSchema } from "../schemas/infrastructure-project-schema";
import type { loginSchema } from "../schemas/login-schema";
import type { profileSchema } from "../schemas/profile-schema";
import type { subjectCombinationSchema } from "../schemas/subject-combination-schema";

export type LoginFormValues = z.infer<typeof loginSchema>;
export type AddContactFormValues = z.infer<typeof addContactSchema>;
export type AddSchoolFormValues = z.infer<typeof addSchoolSchema>;
export type AddStaffFormValues = z.infer<typeof addStaffSchema>;
export type AddWardFormValues = z.infer<typeof addWardSchema>;
export type EditWardRecordFormValues = z.infer<typeof editWardRecordSchema>;
export type EditSchoolRecordFormValues = z.infer<typeof editSchoolRecordSchema>;
export type InfrastructureProjectFormValues = z.infer<
  typeof infrastructureProjectSchema
>;
export type EditRecordFormValues = z.infer<typeof editRecordSchema>;
export type ProfileFormValues = z.infer<typeof profileSchema>;
export type SubjectCombinationFormValues = z.infer<
  typeof subjectCombinationSchema
>;
