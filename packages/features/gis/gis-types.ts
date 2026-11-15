export type LocationUpdate = {
  schoolId: string;
  latitude: number;
  longitude: number;
  accuracy: number | null;
  source: "gps" | "manual" | "import";
  verified: boolean;
};

export type BoundaryUpdate = {
  level: "ward" | "subcounty";
  id: string;
  geojson: string;
};

export type GisActions = {
  updateLocation: (input: LocationUpdate) => Promise<void>;
  updateBoundary: (input: BoundaryUpdate) => Promise<void>;
};
