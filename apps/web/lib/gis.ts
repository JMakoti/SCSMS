import type { GisActions } from "@scsms/features/gis/gis-types";

async function patch(body: unknown) {
  const response = await fetch("/api/gis", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const result = await response.json(); if (!response.ok) throw new Error(result.error ?? "GIS change could not be saved.");
}

export const gisActions: GisActions = {
  updateLocation: (input) => patch({ kind: "location", ...input }),
  updateBoundary: (input) => patch({ kind: "boundary", ...input }),
};
