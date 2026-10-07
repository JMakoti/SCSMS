"use client";

import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";
import { deleteSchool } from "@/repository/school";
import { saveEnrollmentGrade } from "@/repository/enrollment";
import { saveInfrastructureFacility } from "@/repository/infrastructure";
import { resolveSchoolLogo } from "@/lib/resolve-school-logo";

export function SchoolProfileDesktop({ schoolId }: { schoolId: string }) {
  return (
    <SchoolProfileRoutePage
      schoolId={schoolId}
      onDeleteSchool={deleteSchool}
      resolveLogo={resolveSchoolLogo}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
