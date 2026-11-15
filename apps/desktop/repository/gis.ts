import { eq } from "drizzle-orm";
import { db } from "@/lib/database";
import { auditLogs, schools, subcounty, syncQueue, wards } from "@scsms/db";
import type { GisActions } from "@scsms/features/gis/gis-types";
import { validateCoordinates } from "@scsms/features/gis/geo";
import { createLocalId } from "./helpers";

export const gisActions: GisActions = {
  async updateLocation(input) {
    validateCoordinates(input.latitude, input.longitude);
    const [before] = await db.select().from(schools).where(eq(schools.id, input.schoolId)).limit(1);
    if (!before) throw new Error("School not found.");
    const now = new Date().toISOString();
    const values = { latitude: input.latitude, longitude: input.longitude, locationAccuracy: input.accuracy, locationSource: input.source, locationVerified: input.verified, locationVerifiedAt: input.verified ? now : null, locationVerifiedBy: null, updatedAt: now };
    await db.update(schools).set(values).where(eq(schools.id, input.schoolId));
    await db.insert(auditLogs).values({ id: createLocalId(), action: "updated school GIS location", entityType: "school", entityId: input.schoolId, beforeJson: JSON.stringify(before), afterJson: JSON.stringify({ ...before, ...values }) });
    await db.insert(syncQueue).values({ id: createLocalId(), tableName: "schools", recordId: input.schoolId, operation: "update", payloadJson: JSON.stringify({ ...before, ...values }), status: "pending" });
  },
  async updateBoundary(input) {
    const parsed = JSON.parse(input.geojson); const geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
    if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) throw new Error("Boundary must be valid Polygon or MultiPolygon GeoJSON.");
    const now = new Date().toISOString();
    if (input.level === "ward") await db.update(wards).set({ boundaryGeojson: input.geojson, updatedAt: now }).where(eq(wards.id, input.id));
    else await db.update(subcounty).set({ boundaryGeojson: input.geojson, updatedAt: now }).where(eq(subcounty.id, input.id));
    await db.insert(syncQueue).values({ id: createLocalId(), tableName: input.level === "ward" ? "wards" : "subcounty", recordId: input.id, operation: "update", payloadJson: JSON.stringify({ boundaryGeojson: input.geojson, updatedAt: now }), status: "pending" });
  },
};
