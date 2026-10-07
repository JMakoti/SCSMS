import EnrollmentDetailWeb from "./enrollment-detail-web";

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <EnrollmentDetailWeb item={decodeURIComponent(item)} />;
}
