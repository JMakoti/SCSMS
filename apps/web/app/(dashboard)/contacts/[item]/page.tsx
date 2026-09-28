import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage
      active="School Contacts"
      item={decodeURIComponent(item)}
    />
  );
}
