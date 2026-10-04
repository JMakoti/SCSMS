import GradeEnrollmentRoutePage from "@scsms/features/pages/grade-enrollment-route-page";
import { generateGradeStaticParams } from "../../../../static-params";

export function generateStaticParams() {
  return generateGradeStaticParams();
}

export default async function GradeEnrollmentDetailPage({
  params,
}: {
  params: Promise<{ grade: string }>;
}) {
  const { grade } = await params;

  return <GradeEnrollmentRoutePage grade={decodeURIComponent(grade)} />;
}
