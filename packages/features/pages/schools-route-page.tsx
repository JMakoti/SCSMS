"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SchoolsPage from "../pages/schools-page";
import { SchoolProfile } from "../pages/school-profile-page";
import { AddSchoolDialog } from "../dialogs/school-dialogs";
import type {
  AddContactFormValues,
  AddSchoolFormValues,
  InfrastructureProjectFormValues,
  SubjectCombinationFormValues,
} from "../types/forms";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

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

export function SchoolsRoutePage({
  onSaveSchool,
  onChooseFile,
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
  onSaveSchool?: (values: AddSchoolFormValues) => Promise<void>;
  onChooseFile?: () => Promise<string | null>;
  onDeleteSchool?: (schoolId: string) => Promise<void>;
  resolveLogo?: (schoolId: string, logoPath: string) => Promise<string>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
} & InfrastructureProjectActions &
  ContactActions &
  SubjectCombinationActions) {
  const [showAddSchool, setShowAddSchool] = useState(false);
  const router = useRouter();

  return (
    <Suspense fallback={null}>
      <SchoolsRoutePageContent
        showAddSchool={showAddSchool}
        setShowAddSchool={setShowAddSchool}
        onSaveSchool={onSaveSchool}
        onChooseFile={onChooseFile}
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
    </Suspense>
  );
}

function SchoolsRoutePageContent({
  showAddSchool,
  setShowAddSchool,
  onSaveSchool,
  onChooseFile,
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
  showAddSchool: boolean;
  setShowAddSchool: (show: boolean) => void;
  onSaveSchool?: (values: AddSchoolFormValues) => Promise<void>;
  onChooseFile?: () => Promise<string | null>;
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
  const schoolId = useSearchParams().get("school");

  if (schoolId) {
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

  return (
    <>
      <SchoolsPage
        onAdd={() => setShowAddSchool(true)}
        onProfile={(id) =>
          router.push(`/schools?school=${encodeURIComponent(id)}`)
        }
      />
      {showAddSchool && (
        <AddSchoolDialog
          onClose={() => setShowAddSchool(false)}
          onSave={onSaveSchool}
          onChooseFile={onChooseFile}
        />
      )}
    </>
  );
}

export default SchoolsRoutePage;
