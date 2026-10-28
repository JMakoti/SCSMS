"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { saveEnrollmentGrade } from "@/repository/enrollment";

export default function EnrollmentDetailDesktop({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Enrollment"
      item={item}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
    />
  );
}
