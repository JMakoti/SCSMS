"use client";

import SchoolsRoutePage from "@scsms/features/pages/schools-route-page";
import { saveEnrollmentGrade } from "@/lib/enrollment";
import { saveInfrastructureFacility } from "@/lib/infrastructure";

export default function SchoolsPage() {
  return (
    <SchoolsRoutePage
      onSaveEnrollmentGrade={saveEnrollmentGrade}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
