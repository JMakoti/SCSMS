import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@scsms/db/postgres";
import { schools, subcounty, wards } from "@scsms/db/postgress-schemas/index";
import { getAuthenticatedUser } from "@/lib/auth/session";
import { writeSchoolAudit } from "@/lib/school-audit-server";
import { validateCoordinates } from "@scsms/features/gis/geo";
import { parseGeometry, pointInGeometry } from "@scsms/features/gis/geo";

export async function GET(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const kind = new URL(request.url).searchParams.get("kind") ?? "schools";
  const [schoolRows, wardRows, subCountyRows] = await Promise.all([
    db.select().from(schools), db.select().from(wards), db.select().from(subcounty),
  ]);
  if (kind === "boundaries") {
    return NextResponse.json({ type: "FeatureCollection", features: [...subCountyRows.map((row) => ({ level: "subcounty", row })), ...wardRows.map((row) => ({ level: "ward", row }))].flatMap(({ level, row }) => { const geometry = parseGeometry(row.boundaryGeojson); return geometry ? [{ type: "Feature", geometry, properties: { id: row.id, level, name: level === "ward" ? (row as typeof wardRows[number]).wardName : (row as typeof subCountyRows[number]).subCounty } }] : []; }) });
  }
  const features = schoolRows.filter((row) => row.latitude !== null && row.longitude !== null).map((row) => ({ type: "Feature", geometry: { type: "Point", coordinates: [row.longitude, row.latitude] }, properties: { id: row.id, code: row.schoolCode, name: row.displayName, wardId: row.wardId, level: row.level, ownership: row.ownershipType, verified: row.locationVerified } }));
  if (kind === "statistics" || kind === "coverage") {
    const wardById = new Map(wardRows.map((row) => [row.id, row]));
    const outside = schoolRows.filter((row) => row.latitude !== null && row.longitude !== null && pointInGeometry([row.longitude, row.latitude], parseGeometry(wardById.get(row.wardId)?.boundaryGeojson)) === false).map((row) => row.id);
    return NextResponse.json({ totalSchools: schoolRows.length, mappedSchools: features.length, missingCoordinates: schoolRows.length - features.length, verifiedLocations: schoolRows.filter((row) => row.locationVerified).length, outsideAssignedBoundary: outside, byWard: wardRows.map((ward) => ({ wardId: ward.id, ward: ward.wardName, schools: schoolRows.filter((school) => school.wardId === ward.id).length })) });
  }
  return NextResponse.json({ type: "FeatureCollection", features });
}

export async function PATCH(request: Request) {
  const user = await getAuthenticatedUser();
  if (!user) return NextResponse.json({ error: "Authentication required." }, { status: 401 });
  const body = await request.json();
  if (body.kind === "location") {
    const latitude = Number(body.latitude); const longitude = Number(body.longitude);
    try { validateCoordinates(latitude, longitude); } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid coordinates." }, { status: 400 }); }
    const [before] = await db.select().from(schools).where(eq(schools.id, body.schoolId)).limit(1);
    if (!before) return NextResponse.json({ error: "School not found." }, { status: 404 });
    const now = new Date();
    const values = { latitude, longitude, locationAccuracy: body.accuracy ?? null, locationSource: body.source, locationVerified: Boolean(body.verified), locationVerifiedAt: body.verified ? now : null, locationVerifiedBy: body.verified ? user.id : null, updatedAt: now };
    await db.update(schools).set(values).where(eq(schools.id, body.schoolId));
    await writeSchoolAudit("updated school GIS location", body.schoolId, before, { ...before, ...values, actorUserId: user.id });
    return NextResponse.json({ success: true });
  }
  if (body.kind === "boundary") {
    try { const parsed = JSON.parse(body.geojson); const geometry = parsed.type === "Feature" ? parsed.geometry : parsed; if (!geometry || !["Polygon", "MultiPolygon"].includes(geometry.type)) throw new Error(); } catch { return NextResponse.json({ error: "Boundary must be valid Polygon or MultiPolygon GeoJSON." }, { status: 400 }); }
    if (body.level === "ward") await db.update(wards).set({ boundaryGeojson: body.geojson, updatedAt: new Date() }).where(eq(wards.id, body.id));
    else await db.update(subcounty).set({ boundaryGeojson: body.geojson, updatedAt: new Date() }).where(eq(subcounty.id, body.id));
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unsupported GIS operation." }, { status: 400 });
}
