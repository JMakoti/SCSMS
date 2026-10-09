import type { AddSchoolFormValues } from "@scsms/features/types/forms";

function errorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export async function createSchool(values: AddSchoolFormValues) {
  const response = await fetch("/api/schools", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(errorMessage(payload, "The school could not be saved."));
  }
}
