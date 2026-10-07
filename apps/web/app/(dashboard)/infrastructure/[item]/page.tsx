import InfrastructureDetailWeb from "./infrastructure-detail-web";

export default async function InfrastructureDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <InfrastructureDetailWeb item={decodeURIComponent(item)} />;
}
