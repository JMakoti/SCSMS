import { generateItemStaticParams } from "../../../static-params";
import { ContactDetailDesktop } from "./contact-detail-desktop";

export function generateStaticParams() {
  return generateItemStaticParams("School Contacts");
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ item: string }>;
}) {
  const { item } = await params;

  return <ContactDetailDesktop item={decodeURIComponent(item)} />;
}
