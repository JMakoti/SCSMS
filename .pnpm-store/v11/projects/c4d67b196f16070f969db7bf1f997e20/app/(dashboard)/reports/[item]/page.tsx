import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { generateItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateItemStaticParams("Reports");
}

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
