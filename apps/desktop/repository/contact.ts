import { asc, eq } from "drizzle-orm";

import { db } from "@/lib/database";
import { contacts, schools, wards } from "@scsms/db";
import type { AddContactFormValues } from "@scsms/features/types/forms";

import { optional, required, resolveSchoolId, resolveWardId } from "./helpers";

export type Contact = typeof contacts.$inferSelect;
export type ContactDetails = Contact & {
  school: typeof schools.$inferSelect | null;
  ward: typeof wards.$inferSelect | null;
};

export type UpdateContactInput = Partial<AddContactFormValues> & {
  phone2?: string;
  postalAddress?: string;
  ward?: string;
  isPrimary?: boolean;
  isActive?: boolean;
};

const contactRoles: Record<string, NonNullable<Contact["titleType"]>> = {
  "head teacher": "head_teacher",
  headteacher: "head_teacher",
  principal: "head_teacher",
  deputy: "deputy",
  "deputy head teacher": "deputy",
  bursar: "bursar",
  "board chair": "board_chair",
  "board chairperson": "board_chair",
  "senior teacher": "senior_teacher",
};

function mapContactRole(role: string) {
  const normalized = role.trim().toLowerCase();
  const titleType = contactRoles[normalized];
  if (!titleType) {
    throw new Error(`Unsupported contact role "${role}".`);
  }

  return titleType;
}

function mapActiveStatus(status: string | undefined) {
  if (!status) return true;
  return status.trim().toLowerCase() !== "inactive";
}

export async function listContacts() {
  return db.select().from(contacts).orderBy(asc(contacts.name));
}

export async function getContact(id: string) {
  const [contact] = await db
    .select()
    .from(contacts)
    .where(eq(contacts.id, id))
    .limit(1);

  return contact ?? null;
}

export async function getContactDetails(id: string) {
  const contact = await getContact(id);
  if (!contact) return null;

  const [schoolResult, wardResult] = await Promise.all([
    contact.schoolId
      ? db.select().from(schools).where(eq(schools.id, contact.schoolId)).limit(1)
      : Promise.resolve([]),
    contact.wardId
      ? db.select().from(wards).where(eq(wards.id, contact.wardId)).limit(1)
      : Promise.resolve([]),
  ]);

  return {
    ...contact,
    school: schoolResult[0] ?? null,
    ward: wardResult[0] ?? null,
  } satisfies ContactDetails;
}

export async function createContact(input: AddContactFormValues) {
  await db.insert(contacts).values({
    schoolId: await resolveSchoolId(input.school),
    wardId: null,
    titleType: mapContactRole(input.role),
    name: required(input.fullName, "Full name"),
    phone: required(input.phone, "Phone number"),
    phone2: null,
    email: optional(input.email),
    postalAddress: null,
    isPrimary: false,
    isActive: mapActiveStatus(input.status),
  });
}

export async function updateContact(id: string, input: UpdateContactInput) {
  const existing = await getContact(id);
  if (!existing) {
    throw new Error("This contact no longer exists. Refresh the list and try again.");
  }

  await db
    .update(contacts)
    .set({
      schoolId: input.school ? await resolveSchoolId(input.school) : existing.schoolId,
      wardId: input.ward ? await resolveWardId(input.ward) : existing.wardId,
      titleType: input.role ? mapContactRole(input.role) : existing.titleType,
      name: input.fullName ? required(input.fullName, "Full name") : existing.name,
      phone: input.phone ? required(input.phone, "Phone number") : existing.phone,
      phone2: input.phone2 !== undefined ? optional(input.phone2) : existing.phone2,
      email: input.email !== undefined ? optional(input.email) : existing.email,
      postalAddress:
        input.postalAddress !== undefined
          ? optional(input.postalAddress)
          : existing.postalAddress,
      isPrimary: input.isPrimary ?? existing.isPrimary,
      isActive:
        input.isActive ?? (input.status ? mapActiveStatus(input.status) : existing.isActive),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(contacts.id, id));
}

export async function deleteContact(id: string) {
  const existing = await getContact(id);
  if (!existing) {
    throw new Error("This contact no longer exists. Refresh the list and try again.");
  }

  await db.delete(contacts).where(eq(contacts.id, id));
}
