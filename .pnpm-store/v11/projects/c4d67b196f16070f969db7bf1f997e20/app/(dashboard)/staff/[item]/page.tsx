import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { generateItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateItemStaticParams("Staff");
}

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
