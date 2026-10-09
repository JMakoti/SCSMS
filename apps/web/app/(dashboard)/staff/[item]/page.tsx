import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import StaffDetailWeb from "./staff-detail-web";

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <StaffDetailWeb item={decodeURIComponent(item)} />;
}
