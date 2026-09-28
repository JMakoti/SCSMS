import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage
      active="Enrollment"
      item={decodeURIComponent(item)}
    />
  );
}
