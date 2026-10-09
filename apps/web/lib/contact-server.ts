import { eq } from "drizzle-orm";
import { db } from "@scsms/db/postgres";
import { contacts } from "@scsms/db/postgress-schemas/index";
import type { AddContactFormValues } from "@scsms/features/types/forms";
import {
  contactRoles,
  mapActiveStatus,
  resolveContactSchoolId,
} from "./contact-utils";
import { writeSchoolAudit } from "./school-audit-server";

export type UpdateContactInput = Partial<AddContactFormValues>;

export async function getContact(id: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  return contact ?? null;
}

export async function createContactRecord(input: AddContactFormValues) {
  const values = {
    schoolId: await resolveContactSchoolId(input.school),
    wardId: null,
    titleType: contactRoles(input.role),
    name: input.fullName.trim(),
    phone: input.phone.trim(),
    phone2: input.phone2?.trim() || null,
    email: input.email.trim() || null,
    postalAddress: null,
    isPrimary: false,
    isActive: mapActiveStatus(input.status),
  };
  await db.insert(contacts).values(values);
  await writeSchoolAudit("created contact", values.schoolId, null, values);
}

export async function updateContactRecord(
  id: string,
  input: UpdateContactInput,
) {
  const existing = await getContact(id);
  if (!existing) {
    throw new Error("This contact no longer exists. Refresh the list and try again.");
  }

  const updates = {
    schoolId: input.school
      ? await resolveContactSchoolId(input.school)
      : existing.schoolId,
    titleType: input.role ? contactRoles(input.role) : existing.titleType,
    name: input.fullName?.trim() || existing.name,
    phone: input.phone?.trim() || existing.phone,
    phone2:
      input.phone2 !== undefined ? input.phone2.trim() || null : existing.phone2,
    email:
      input.email !== undefined ? input.email.trim() || null : existing.email,
    isActive:
      input.status !== undefined
        ? mapActiveStatus(input.status)
        : existing.isActive,
    updatedAt: new Date(),
  };
  await db
    .update(contacts)
    .set(updates)
    .where(eq(contacts.id, id));
  await writeSchoolAudit("updated contact", updates.schoolId, existing, {
    ...existing,
    ...updates,
  });
}

export async function deleteContactRecord(id: string) {
  const existing = await getContact(id);
  if (!existing) {
    throw new Error("This contact no longer exists. Refresh the list and try again.");
  }

  await db.delete(contacts).where(eq(contacts.id, id));
  await writeSchoolAudit("deleted contact", existing.schoolId, existing, null);
}
