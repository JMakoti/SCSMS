import { generateItemStaticParams } from "../../../static-params";
import { Suspense } from "react";
import WardDetailRoutePage from "./ward-detail-route-page";

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
    <Suspense fallback={<div className="content">Loading ward record...</div>}>
      <WardDetailRoutePage item={decodeURIComponent(item)} />
    </Suspense>
  );
}
