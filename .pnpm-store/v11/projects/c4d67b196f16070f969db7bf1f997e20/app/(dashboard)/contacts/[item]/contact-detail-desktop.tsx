"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { createContact, deleteContact, updateContact } from "@/repository/contact";

export function ContactDetailDesktop({ item }: { item: string }) {
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
