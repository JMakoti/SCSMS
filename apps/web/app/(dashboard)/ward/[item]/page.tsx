import WardDetailRoutePage from "./ward-detail-route-page";

export default async function WardDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return (
    <WardDetailRoutePage item={decodeURIComponent(item)} />
  );
}
