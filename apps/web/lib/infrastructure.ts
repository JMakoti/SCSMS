import type { InfrastructureFacilitySaveInput } from "@scsms/features/schemas/infrastructure-facility-schema";
import type { InfrastructureProjectFormValues } from "@scsms/features/types/forms";

function errorMessage(payload: unknown, fallback: string) {
  return payload &&
    typeof payload === "object" &&
    "error" in payload &&
    typeof payload.error === "string"
    ? payload.error
    : fallback;
}

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
      errorMessage(payload, "The infrastructure facility could not be saved."),
    );
  }
}

export async function createInfrastructureProject(
  input: InfrastructureProjectFormValues,
) {
  const response = await fetch("/api/infrastructure/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The infrastructure project could not be saved."),
    );
  }

  return payload &&
    typeof payload === "object" &&
    "id" in payload &&
    typeof payload.id === "string"
    ? payload.id
    : undefined;
}

export async function updateInfrastructureProject(
  projectId: string,
  input: InfrastructureProjectFormValues,
) {
  const response = await fetch(
    `/api/infrastructure/projects/${encodeURIComponent(projectId)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The infrastructure project could not be saved."),
    );
  }
}

export async function deleteInfrastructureProject(projectId: string) {
  const response = await fetch(
    `/api/infrastructure/projects/${encodeURIComponent(projectId)}`,
    { method: "DELETE" },
  );
  const payload: unknown = await response.json();

  if (!response.ok) {
    throw new Error(
      errorMessage(payload, "The infrastructure project could not be deleted."),
    );
  }
}
