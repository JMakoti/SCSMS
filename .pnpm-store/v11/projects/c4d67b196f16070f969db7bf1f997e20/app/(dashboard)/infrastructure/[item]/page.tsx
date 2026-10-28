import InfrastructureDetailDesktop from "./infrastructure-detail-desktop";
import { generateItemStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateItemStaticParams("Infrastructure");
}

export default async function InfrastructureDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <InfrastructureDetailDesktop item={decodeURIComponent(item)} />;
}
