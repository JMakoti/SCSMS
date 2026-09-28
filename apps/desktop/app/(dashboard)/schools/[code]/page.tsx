import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <SchoolProfileRoutePage schoolId={decodeURIComponent(code)} />;
}
