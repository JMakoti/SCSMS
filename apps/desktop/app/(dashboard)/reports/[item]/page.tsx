import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default async function ReportDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage active="Reports" item={decodeURIComponent(item)} />
  );
}
