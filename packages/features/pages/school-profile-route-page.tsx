"use client";

import { useRouter } from "next/navigation";
import { SchoolProfile } from "../pages/school-profile-page";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import type {
  AddContactFormValues,
  InfrastructureProjectFormValues,
  SubjectCombinationFormValues,
} from "../types/forms";

type InfrastructureProjectActions = {
  onCreateInfrastructureProject?: (
    input: InfrastructureProjectFormValues,
  ) => Promise<string | void>;
  onUpdateInfrastructureProject?: (
    projectId: string,
    input: InfrastructureProjectFormValues,
  ) => Promise<void>;
  onDeleteInfrastructureProject?: (projectId: string) => Promise<void>;
};
type ContactActions = {
  onCreateContact?: (values: AddContactFormValues) => Promise<void>;
  onUpdateContact?: (
    contactId: string,
    values: Partial<AddContactFormValues>,
  ) => Promise<void>;
  onDeleteContact?: (contactId: string) => Promise<void>;
};
type SubjectCombinationActions = {
  onCreateSubjectCombination?: (
    input: SubjectCombinationFormValues,
  ) => Promise<string | void>;
  onUpdateSubjectCombination?: (
    id: string,
    input: SubjectCombinationFormValues,
  ) => Promise<void>;
  onDeleteSubjectCombination?: (id: string) => Promise<void>;
};

export function SchoolProfileRoutePage({
  schoolId,
  onDeleteSchool,
  resolveLogo,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
  onCreateInfrastructureProject,
  onUpdateInfrastructureProject,
  onDeleteInfrastructureProject,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
  onCreateSubjectCombination,
  onUpdateSubjectCombination,
  onDeleteSubjectCombination,
}: {
  schoolId: string;
  onDeleteSchool?: (schoolId: string) => Promise<void>;
  resolveLogo?: (schoolId: string, logoPath: string) => Promise<string>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
} & InfrastructureProjectActions &
  ContactActions &
  SubjectCombinationActions) {
  const router = useRouter();

  return (
    <SchoolProfile
      schoolId={schoolId}
      onBack={() => router.push("/schools")}
      onDeleteSchool={onDeleteSchool}
      resolveLogo={resolveLogo}
      onSaveEnrollmentGrade={onSaveEnrollmentGrade}
      onSaveInfrastructureFacility={onSaveInfrastructureFacility}
      onCreateInfrastructureProject={onCreateInfrastructureProject}
      onUpdateInfrastructureProject={onUpdateInfrastructureProject}
      onDeleteInfrastructureProject={onDeleteInfrastructureProject}
      onCreateContact={onCreateContact}
      onUpdateContact={onUpdateContact}
      onDeleteContact={onDeleteContact}
      onCreateSubjectCombination={onCreateSubjectCombination}
      onUpdateSubjectCombination={onUpdateSubjectCombination}
      onDeleteSubjectCombination={onDeleteSubjectCombination}
    />
  );
}

export default SchoolProfileRoutePage;
