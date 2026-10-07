"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { saveEnrollmentGrade } from "@/lib/enrollment";

export default function EnrollmentDetailWeb({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Enrollment"
      item={item}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
    />
  );
}
