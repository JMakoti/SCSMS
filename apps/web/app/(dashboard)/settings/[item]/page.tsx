import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default async function SettingDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage active="Settings" item={decodeURIComponent(item)} />
  );
}
