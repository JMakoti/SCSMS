"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import { createContact, deleteContact, updateContact } from "@/lib/contact";

export default function ContactsPage() {
  return (
    <ModuleRoutePage
      active="School Contacts"
      onCreateContact={createContact}
      onUpdateContact={updateContact}
      onDeleteContact={deleteContact}
    />
  );
}
