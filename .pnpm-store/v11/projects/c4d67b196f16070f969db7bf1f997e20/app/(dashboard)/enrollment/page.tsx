"use client";

import EnrollmentRoutePage from "@scsms/features/pages/enrollment-route-page";
import { saveEnrollmentGrade } from "@/repository/enrollment";

export default function EnrollmentPage() {
  return <EnrollmentRoutePage onSaveEnrollmentGrade={saveEnrollmentGrade} />;
}
