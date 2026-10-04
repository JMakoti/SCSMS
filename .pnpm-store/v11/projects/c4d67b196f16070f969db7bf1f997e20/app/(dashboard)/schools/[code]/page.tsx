import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";
import { generateSchoolStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateSchoolStaticParams();
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <SchoolProfileRoutePage schoolId={decodeURIComponent(code)} />;
}
