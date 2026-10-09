"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  EnrollmentContent,
  GradeEnrollmentPage,
} from "../pages/enrollment-page";
import { RecordDetail } from "./record-detail";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";

export function EnrollmentRoutePage({
  onSaveEnrollmentGrade,
}: {
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
}) {
  return (
    <Suspense fallback={null}>
      <EnrollmentRoutePageContent onSaveEnrollmentGrade={onSaveEnrollmentGrade} />
    </Suspense>
  );
}

function EnrollmentRoutePageContent({
  onSaveEnrollmentGrade,
}: {
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
}) {
  const router = useRouter();
  const query = useSearchParams();
  const item = query.get("item");
  const grade = query.get("grade");

  if (item) {
    return (
      <RecordDetail
        active="Enrollment"
        item={item}
        onBack={() => router.push("/enrollment")}
        onSaveEnrollmentGrade={onSaveEnrollmentGrade}
      />
    );
  }

  if (grade) {
    return (
      <GradeEnrollmentPage
        grade={grade}
        onBack={() => router.push("/enrollment")}
      />
    );
  }

  return (
    <EnrollmentContent
      onDetail={(selectedItem) =>
        router.push(`/enrollment?item=${encodeURIComponent(selectedItem)}`)
      }
      onGradeSelect={(selectedGrade) =>
        router.push(`/enrollment?grade=${encodeURIComponent(selectedGrade)}`)
      }
    />
  );
}

export default EnrollmentRoutePage;
