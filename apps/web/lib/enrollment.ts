import type { EnrollmentGradeSaveInput } from "@scsms/features/schemas/enrollment-grade-schema";

export async function saveEnrollmentGrade(input: EnrollmentGradeSaveInput) {
  const response = await fetch("/api/enrollment/grade", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const payload: unknown = await response.json();
  if (!response.ok) {
    throw new Error(
      payload &&
        typeof payload === "object" &&
        "error" in payload &&
        typeof payload.error === "string"
        ? payload.error
        : "The enrollment grade could not be saved.",
    );
  }
}
