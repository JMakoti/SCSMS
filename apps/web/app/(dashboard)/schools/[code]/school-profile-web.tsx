"use client";

import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";
import { saveEnrollmentGrade } from "@/lib/enrollment";
import { saveInfrastructureFacility } from "@/lib/infrastructure";

export default function SchoolProfileWeb({ schoolId }: { schoolId: string }) {
  return (
    <SchoolProfileRoutePage
      schoolId={schoolId}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
