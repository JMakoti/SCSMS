import SchoolProfileWeb from "./school-profile-web";

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <SchoolProfileWeb schoolId={decodeURIComponent(code)} />;
}
