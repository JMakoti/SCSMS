import { generateSchoolStaticParams } from "../../../static-params";
import { SchoolProfileDesktop } from "./school-profile-desktop";

export function generateStaticParams() {
  return generateSchoolStaticParams();
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <SchoolProfileDesktop schoolId={decodeURIComponent(code)} />;
}
