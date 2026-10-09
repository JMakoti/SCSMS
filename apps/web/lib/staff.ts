import type {
  AddStaffFormValues,
  EditRecordFormValues,
} from "@scsms/features/types/forms";

function errorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export async function createStaffMember(values: AddStaffFormValues) {
  const response = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The staff record could not be saved."));
  }
}

export async function updateStaffMember(
  staffId: string,
  values: EditRecordFormValues,
) {
  const response = await fetch(`/api/staff/${encodeURIComponent(staffId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The staff record could not be saved."));
  }
}

export async function deleteStaffMember(staffId: string) {
  const response = await fetch(`/api/staff/${encodeURIComponent(staffId)}`, {
    method: "DELETE",
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The staff record could not be deleted."));
  }
}
