"use client";

import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";
import type { MapLayerMouseEvent } from "maplibre-gl";
import type { RabaiSchool } from "../types/enterprise";
import type { WardSummary } from "../data/feature-data-context";
import { parseGeometry, pointInGeometry, type GeoGeometry } from "./geo";
import boundaryData from "./kilifi-boundaries.json";

const mapStyle = process.env.NEXT_PUBLIC_GIS_STREET_STYLE_URL
  || "https://tiles.openfreemap.org/styles/liberty";
const rabaiWardNames = new Set(["Mwawesa", "Ruruma", "Kambe/Ribe", "Rabai/Kisurutini"].map(normalizeWardName));

function geometryCoordinates(geometry: GeoGeometry) {
  const positions: [number, number][] = [];
  const collect = (coordinates: unknown) => {
    if (!Array.isArray(coordinates)) return;
    if (typeof coordinates[0] === "number" && typeof coordinates[1] === "number") {
      positions.push([coordinates[0], coordinates[1]]);
      return;
    }
    coordinates.forEach(collect);
  };
  collect(geometry.coordinates);
  return positions;
}

function ringArea(ring: number[][]) {
  return ring.reduce((area, coordinate, index) => {
    const next = ring[(index + 1) % ring.length];
    return area + coordinate[0] * next[1] - next[0] * coordinate[1];
  }, 0) / 2;
}

function normalizeWardName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function popupContent(school: RabaiSchool, wardName: string) {
  const content = document.createElement("div");
  const name = document.createElement("strong");
  name.textContent = school.displayName;
  const ward = document.createElement("p");
  ward.textContent = `Ward by coordinates: ${wardName}`;
  const coordinates = document.createElement("small");
  coordinates.textContent = `${school.latitude?.toFixed(5)}, ${school.longitude?.toFixed(5)}`;
  content.append(name, ward, coordinates);
  return content;
}

export default function GisMap({ schools, wards }: {
  schools: RabaiSchool[];
  wards: WardSummary[];
}) {
  const container = useRef<HTMLDivElement>(null);
  const [locatedSchoolCount, setLocatedSchoolCount] = useState<number | null>(null);

  useEffect(() => {
    let disposed = false;
    let map: import("maplibre-gl").Map | undefined;
    setLocatedSchoolCount(null);

    void import("maplibre-gl").then((maplibregl) => {
      if (disposed || !container.current) return;

      maplibregl.setWorkerUrl("/maplibre-gl-worker.mjs");
      const countyFeature = boundaryData.features.find((feature) => feature.properties.shapeType === "ADM1");
      const countyGeometry = countyFeature && parseGeometry(JSON.stringify(countyFeature.geometry));
      if (!countyFeature || !countyGeometry) {
        throw new Error("Kilifi County boundary data is missing or invalid.");
      }

      const countyCoordinates = geometryCoordinates(countyGeometry);
      const countyPolygons = countyGeometry.type === "Polygon"
        ? [countyGeometry.coordinates]
        : countyGeometry.coordinates;
      const countyHoles = countyPolygons.map((polygon) => {
        const outerRing = polygon[0];
        return ringArea(outerRing) > 0 ? [...outerRing].reverse() : outerRing;
      });
      const worldRing = [
        [-180, -85],
        [180, -85],
        [180, 85],
        [-180, 85],
        [-180, -85],
      ];
      const bounds = countyCoordinates.reduce(
        (value, coordinate) => ({
          west: Math.min(value.west, coordinate[0]),
          south: Math.min(value.south, coordinate[1]),
          east: Math.max(value.east, coordinate[0]),
          north: Math.max(value.north, coordinate[1]),
        }),
        { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
      );
      const mapBounds: [[number, number], [number, number]] = [
        [bounds.west - 0.08, bounds.south - 0.08],
        [bounds.east + 0.08, bounds.north + 0.08],
      ];

      const wardShapes = boundaryData.features
        .filter((feature) => feature.properties.shapeType === "ADM3")
        .map((feature) => {
          const wardName = feature.properties.shapeName;
          const storedWard = wards.find((ward) => normalizeWardName(ward.name) === normalizeWardName(wardName));
          const geometry = parseGeometry(storedWard?.boundaryGeojson)
            ?? parseGeometry(JSON.stringify(feature.geometry));
          return geometry ? { name: wardName, geometry } : null;
        })
        .filter((ward): ward is { name: string; geometry: GeoGeometry } => ward !== null);
      const rabaiCoordinates = wardShapes
        .filter((ward) => rabaiWardNames.has(normalizeWardName(ward.name)))
        .flatMap((ward) => geometryCoordinates(ward.geometry));
      const focusCoordinates = rabaiCoordinates.length ? rabaiCoordinates : countyCoordinates;
      const focusBounds = focusCoordinates.reduce(
        (value, coordinate) => ({
          west: Math.min(value.west, coordinate[0]),
          south: Math.min(value.south, coordinate[1]),
          east: Math.max(value.east, coordinate[0]),
          north: Math.max(value.north, coordinate[1]),
        }),
        { west: Infinity, south: Infinity, east: -Infinity, north: -Infinity },
      );

      const locatedSchools = schools.filter((school) =>
        school.latitude !== null
        && school.longitude !== null
        && Number.isFinite(school.latitude)
        && Number.isFinite(school.longitude)
        && pointInGeometry([school.longitude, school.latitude], countyGeometry) === true,
      );
      setLocatedSchoolCount(locatedSchools.length);
      const schoolWard = (school: RabaiSchool) => wardShapes.find((ward) =>
        pointInGeometry([school.longitude!, school.latitude!], ward.geometry) === true,
      )?.name ?? "Ward not identified";

      const wardCounts = new Map<string, number>();
      const schoolFeatures = locatedSchools.map((school) => {
        const wardName = schoolWard(school);
        wardCounts.set(wardName, (wardCounts.get(wardName) ?? 0) + 1);
        return {
          type: "Feature" as const,
          geometry: { type: "Point" as const, coordinates: [school.longitude!, school.latitude!] },
          properties: {
            id: school.id,
            name: school.displayName,
            wardName,
            level: school.institutionType,
          },
        };
      });
      const wardFeatures = wardShapes.map((ward) => ({
        type: "Feature" as const,
        geometry: ward.geometry,
        properties: { name: ward.name, schoolCount: wardCounts.get(ward.name) ?? 0 },
      }));

      map = new maplibregl.Map({
        container: container.current,
        style: mapStyle,
        center: [39.7, -3.4],
        zoom: 7,
        minZoom: 6,
        maxZoom: 17,
        maxBounds: mapBounds,
        attributionControl: false,
      });
      map.addControl(new maplibregl.NavigationControl(), "top-right");
      map.addControl(new maplibregl.FullscreenControl(), "top-right");
      map.addControl(new maplibregl.AttributionControl({ compact: true }), "bottom-right");

      map.on("load", () => {
        map?.addSource("county-mask", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [worldRing, ...countyHoles] },
            properties: {},
          },
        });
        map?.addLayer({
          id: "county-mask",
          type: "fill",
          source: "county-mask",
          paint: { "fill-color": "#f1f5f9", "fill-opacity": 1 },
        });
        map?.addSource("county", {
          type: "geojson",
          data: {
            type: "Feature",
            geometry: countyGeometry,
            properties: { name: "Kilifi County" },
          },
        });
        map?.addLayer({
          id: "county-fill",
          type: "fill",
          source: "county",
          paint: { "fill-color": "#f8fafc", "fill-opacity": 0.28 },
        });
        map?.addSource("wards", {
          type: "geojson",
          data: { type: "FeatureCollection", features: wardFeatures },
        });
        map?.addLayer({
          id: "ward-fill",
          type: "fill",
          source: "wards",
          paint: {
            "fill-color": ["step", ["get", "schoolCount"], "#dbeafe", 1, "#bfdbfe", 5, "#93c5fd", 10, "#60a5fa"],
            "fill-opacity": 0.42,
          },
        });
        map?.addLayer({
          id: "ward-boundaries",
          type: "line",
          source: "wards",
          paint: { "line-color": "#1d4ed8", "line-width": 1.5, "line-opacity": 0.82 },
        });
        map?.addLayer({
          id: "ward-labels",
          type: "symbol",
          source: "wards",
          minzoom: 8,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-font": ["Open Sans Regular"],
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#1e3a8a",
            "text-halo-color": "#ffffff",
            "text-halo-width": 1.4,
          },
        });
        map?.addLayer({
          id: "county-boundary",
          type: "line",
          source: "county",
          paint: { "line-color": "#0f172a", "line-width": 3 },
        });
        map?.addSource("schools", {
          type: "geojson",
          data: { type: "FeatureCollection", features: schoolFeatures },
          cluster: true,
          clusterRadius: 44,
          clusterMaxZoom: 13,
        });
        map?.addLayer({
          id: "school-clusters",
          type: "circle",
          source: "schools",
          filter: ["has", "point_count"],
          paint: {
            "circle-color": "#0f766e",
            "circle-radius": ["step", ["get", "point_count"], 17, 15, 22, 50, 28],
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });
        map?.addLayer({
          id: "school-cluster-count",
          type: "symbol",
          source: "schools",
          filter: ["has", "point_count"],
          layout: {
            "text-field": ["get", "point_count_abbreviated"],
            "text-size": 12,
          },
          paint: { "text-color": "#ffffff" },
        });
        map?.addLayer({
          id: "school-points",
          type: "circle",
          source: "schools",
          filter: ["!", ["has", "point_count"]],
          paint: {
            "circle-radius": 7,
            "circle-color": "#0f766e",
            "circle-stroke-width": 2,
            "circle-stroke-color": "#ffffff",
          },
        });

        map?.on("click", "school-clusters", async (event: MapLayerMouseEvent) => {
          if (!map) return;
          const feature = event.features?.[0];
          const source = map.getSource("schools") as import("maplibre-gl").GeoJSONSource;
          if (!feature || !source) return;
          const zoom = await source.getClusterExpansionZoom(Number(feature.properties?.cluster_id));
          map.easeTo({
            center: (feature.geometry as { coordinates: [number, number] }).coordinates,
            zoom,
          });
        });
        map?.on("click", "school-points", (event: MapLayerMouseEvent) => {
          const feature = event.features?.[0];
          const school = schools.find((item) => item.id === feature?.properties?.id);
          if (!school || school.longitude === null || school.latitude === null) return;
          const wardName = String(feature?.properties?.wardName ?? "Ward not identified");
          new maplibregl.Popup({ closeButton: true, offset: 12 })
            .setLngLat([school.longitude, school.latitude])
            .setDOMContent(popupContent(school, wardName))
            .addTo(map!);
        });

        for (const layer of ["school-clusters", "school-points"]) {
          map?.on("mouseenter", layer, () => {
            if (map) map.getCanvas().style.cursor = "pointer";
          });
          map?.on("mouseleave", layer, () => {
            if (map) map.getCanvas().style.cursor = "";
          });
        }

        map?.fitBounds(
          [[focusBounds.west, focusBounds.south], [focusBounds.east, focusBounds.north]],
          { padding: 48, maxZoom: 10 },
        );
      });
    });

    return () => {
      disposed = true;
      map?.remove();
    };
  }, [schools, wards]);

  return (
    <div className="gis-map" ref={container} aria-label="Interactive map of Kilifi County schools and wards">
      {locatedSchoolCount === 0 && (
        <div className="gis-map-no-schools" role="status">
          No schools have coordinates inside Kilifi County yet.
        </div>
      )}
    </div>
  );
}
