import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage active="Staff" item={decodeURIComponent(item)} />
  );
}
