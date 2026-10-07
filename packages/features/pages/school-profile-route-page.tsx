"use client";

import { useRouter } from "next/navigation";
import { SchoolProfile } from "../pages/school-profile-page";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

export function SchoolProfileRoutePage({
  schoolId,
  onDeleteSchool,
  resolveLogo,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
}: {
  schoolId: string;
  onDeleteSchool?: (schoolId: string) => Promise<void>;
  resolveLogo?: (schoolId: string, logoPath: string) => Promise<string>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
  const router = useRouter();

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

export default SchoolProfileRoutePage;
