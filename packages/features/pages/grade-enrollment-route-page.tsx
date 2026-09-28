"use client";

import { useRouter } from "next/navigation";
import { GradeEnrollmentPage } from "../pages/enrollment-page";

export function GradeEnrollmentRoutePage({ grade }: { grade: string }) {
  const router = useRouter();

  return (
    <GradeEnrollmentPage
      grade={grade}
      onBack={() => router.push("/enrollment")}
    />
  );
}

export default GradeEnrollmentRoutePage;
