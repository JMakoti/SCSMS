import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { generateItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateItemStaticParams("Audit Logs");
}

export default async function AuditLogDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage
      active="Audit Logs"
      item={decodeURIComponent(item)}
    />
  );
}
