export type GeoGeometry =
  | { type: "Polygon"; coordinates: number[][][] }
  | { type: "MultiPolygon"; coordinates: number[][][][] };

export function parseGeometry(value: string | null | undefined): GeoGeometry | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    const geometry = parsed.type === "Feature" ? parsed.geometry : parsed;
    return geometry?.type === "Polygon" || geometry?.type === "MultiPolygon" ? geometry : null;
  } catch {
    return null;
  }
}

function inRing(point: [number, number], ring: number[][]) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > point[1] !== yj > point[1]
      && point[0] < ((xj - xi) * (point[1] - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
}

export function pointInGeometry(point: [number, number], geometry: GeoGeometry | null) {
  if (!geometry) return null;
  const polygons = geometry.type === "Polygon" ? [geometry.coordinates] : geometry.coordinates;
  return polygons.some((polygon) =>
    inRing(point, polygon[0]) && !polygon.slice(1).some((hole) => inRing(point, hole)),
  );
}

export function validateCoordinates(latitude: number, longitude: number) {
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90) {
    throw new Error("Latitude must be between -90 and 90.");
  }
  if (!Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Longitude must be between -180 and 180.");
  }
}
