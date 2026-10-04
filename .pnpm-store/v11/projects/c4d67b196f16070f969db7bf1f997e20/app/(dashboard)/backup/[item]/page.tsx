import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { generateFallbackItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateFallbackItemStaticParams();
}

export default async function BackupDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <RecordDetailRoutePage
      active="Backup & Restore"
      item={decodeURIComponent(item)}
    />
  );
}
