import type { AddContactFormValues } from "@scsms/features/types/forms";

function errorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export async function createContact(values: AddContactFormValues) {
  const response = await fetch("/api/contacts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The contact could not be saved."));
  }
}

export async function updateContact(
  contactId: string,
  values: Partial<AddContactFormValues>,
) {
  const response = await fetch(`/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The contact could not be saved."));
  }
}

export async function deleteContact(contactId: string) {
  const response = await fetch(`/api/contacts/${encodeURIComponent(contactId)}`, {
    method: "DELETE",
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The contact could not be deleted."));
  }
}
