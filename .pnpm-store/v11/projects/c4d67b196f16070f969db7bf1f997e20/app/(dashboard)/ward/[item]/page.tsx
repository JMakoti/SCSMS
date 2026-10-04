import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { generateItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateItemStaticParams("Ward");
}

export default async function WardDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage active="Ward" item={decodeURIComponent(item)} />
  );
}
