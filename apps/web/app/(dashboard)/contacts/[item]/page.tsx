import { ContactDetailWeb } from "./contact-detail-web";

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <ContactDetailWeb item={decodeURIComponent(item)} />;
}
