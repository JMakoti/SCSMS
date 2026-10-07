import type { InfrastructureFacilitySaveInput } from "@scsms/features/schemas/infrastructure-facility-schema";

export async function saveInfrastructureFacility(
  input: InfrastructureFacilitySaveInput,
) {
  const response = await fetch("/api/infrastructure/facility", {
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
        : "The infrastructure facility could not be saved.",
    );
  }
}
