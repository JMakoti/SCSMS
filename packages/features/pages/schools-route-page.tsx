"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import SchoolsPage from "../pages/schools-page";
import { SchoolProfile } from "../pages/school-profile-page";
import { AddSchoolDialog } from "../dialogs/school-dialogs";
import type { AddSchoolFormValues } from "../types/forms";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

export function SchoolsRoutePage({
  onSaveSchool,
  onChooseFile,
  onDeleteSchool,
  resolveLogo,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
}: {
  onSaveSchool?: (values: AddSchoolFormValues) => Promise<void>;
  onChooseFile?: () => Promise<string | null>;
  onDeleteSchool?: (schoolId: string) => Promise<void>;
  resolveLogo?: (schoolId: string, logoPath: string) => Promise<string>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
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
}) {
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
