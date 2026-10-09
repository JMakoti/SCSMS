"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { createContact, deleteContact, updateContact } from "@/lib/contact";

export function ContactDetailWeb({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="School Contacts"
      item={item}
      onCreateContact={createContact}
      onUpdateContact={updateContact}
      onDeleteContact={deleteContact}
    />
  );
}
