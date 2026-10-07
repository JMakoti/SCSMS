"use client";

import SchoolsRoutePage from "@scsms/features/pages/schools-route-page";
import { chooseSchoolLogoFile } from "@/lib/choose-school-logo-file";
import { resolveSchoolLogo } from "@/lib/resolve-school-logo";
import { createSchool, deleteSchool } from "@/repository/school";
import { saveEnrollmentGrade } from "@/repository/enrollment";
import { saveInfrastructureFacility } from "@/repository/infrastructure";

export default function SchoolsPage() {
  return (
    <SchoolsRoutePage
      onSaveSchool={createSchool}
      onChooseFile={chooseSchoolLogoFile}
      onDeleteSchool={deleteSchool}
      resolveLogo={resolveSchoolLogo}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
