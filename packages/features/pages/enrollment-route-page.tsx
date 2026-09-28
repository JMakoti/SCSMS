"use client";

import { useRouter } from "next/navigation";
import { EnrollmentContent } from "../pages/enrollment-page";

export function EnrollmentRoutePage() {
  const router = useRouter();

  return (
    <EnrollmentContent
      onDetail={(item) =>
        router.push(`/enrollment/${encodeURIComponent(item)}`)
      }
      onGradeSelect={(grade) =>
        router.push(`/enrollment/grades/${encodeURIComponent(grade)}`)
      }
    />
  );
}

export default EnrollmentRoutePage;
