import type { SubjectCombinationFormValues } from "@scsms/features/types/forms";

function errorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

export async function createSubjectCombination(
  values: SubjectCombinationFormValues,
) {
  const response = await fetch("/api/subject-combinations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(values),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The subject combination could not be saved."),
    );
  }

  return typeof payload === "object" &&
    payload !== null &&
    "id" in payload &&
    typeof payload.id === "string"
    ? payload.id
    : undefined;
}

export async function updateSubjectCombination(
  id: string,
  values: SubjectCombinationFormValues,
) {
  const response = await fetch(
    `/api/subject-combinations/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The subject combination could not be saved."),
    );
  }
}

export async function deleteSubjectCombination(id: string) {
  const response = await fetch(
    `/api/subject-combinations/${encodeURIComponent(id)}`,
    {
      method: "DELETE",
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The subject combination could not be deleted."),
    );
  }
}
