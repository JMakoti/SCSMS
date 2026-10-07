import EnrollmentDetailDesktop from "./enrollment-detail-desktop";
import { generateEnrollmentStaticParams } from "../../../static-params";

export function generateStaticParams() {
  return generateEnrollmentStaticParams();
}

export default async function EnrollmentDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <EnrollmentDetailDesktop item={decodeURIComponent(item)} />;
}
