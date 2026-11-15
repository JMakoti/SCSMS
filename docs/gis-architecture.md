# SCSMS GIS Architecture and Cost Strategy

## Implementation architecture

The GIS module is a shared `@scsms/features` capability used by the Next.js web and Tauri desktop applications. It does not introduce a parallel school registry. School points and verification metadata are stored on the existing `schools` row; county/subcounty and ward GeoJSON is stored on the existing administrative records. Existing enrollment, staff and infrastructure snapshots supply thematic analytics.

The browser map uses MapLibre GL JS and GeoJSON sources, initially focused on Rabai Sub-County within Kilifi County. Marker clustering runs in the MapLibre worker. Point-in-polygon validation runs locally for immediate feedback and offline use. Online deployments can add a generated PostGIS point and GIST index to the existing `schools` table for large-scale `ST_Within`, `ST_DWithin`, density and coverage queries without changing the application data contract.

```text
Shared GIS UI (MapLibre county and ward map)
        |                              |
Next.js authenticated API       Tauri Drizzle proxy
        |                              |
PostgreSQL / optional PostGIS    SQLite school and admin rows
        |                              |
        +------ existing synchronization queue ------+
```

Location changes write an audit entry. Desktop changes also write the existing `sync_queue`, using the school record as the synchronization unit so the current conflict strategy continues to apply. No coordinates are inferred or generated.

## Infrastructure

- Basemap: OpenFreeMap Liberty style for street mapping, with OpenStreetMap attribution inherited from the style.
- Worker: `scripts/prepare-maplibre-worker.mjs` copies MapLibre's version-matched worker bundle into each app's `public` directory before development and production builds; the map sets a same-origin worker URL so the bundler does not need to resolve MapLibre's internal worker path.
- Offline: configure MapLibre with an organization-hosted raster/vector tile URL or a local tile service packaged beside Tauri. The application data and boundary overlays remain available from SQLite when disconnected.
- Tile configuration: set `NEXT_PUBLIC_GIS_STREET_STYLE_URL` to a local or self-hosted MapLibre style. Tauri can point it at a loopback tile service or organization LAN host.
- Boundaries: the shared GIS UI bundles simplified Kilifi County (ADM1, geoBoundaries public domain) and its 35 wards (ADM3, Benedict Aboki Omare and George Omare, CC BY 4.0) in `packages/features/gis/kilifi-boundaries.json`. Keep the ward attribution visible in the map and retain an authoritative full-resolution copy for PostGIS validation.
- PostGIS: enable the extension in managed PostgreSQL, add a generated `geometry(Point, 4326)` column to `schools`, and create a GIST index. Keep latitude/longitude as the synchronization source of truth for SQLite compatibility.
- Security: authenticated GIS writes use the current session. Production authorization should map coordinate editing, verification and boundary import to existing role permissions; verification should be limited to designated data stewards.

## Free-first cost strategy

The default stack has no software licensing fee: MapLibre, GeoJSON, OpenStreetMap-compatible styles, SQLite, PostgreSQL and PostGIS are open source. OpenFreeMap avoids a commercial map token for normal interactive use.

Public community tile endpoints are not a capacity guarantee. For production, cache responsibly and move to self-hosted OpenMapTiles/PMTiles when traffic or offline coverage grows. A small county/subcounty deployment can run the web app, PostgreSQL/PostGIS and tile cache on one modest server, then split tiles and database only when monitoring shows sustained load.

Cost controls:

1. Store only verified points and simplified boundary GeoJSON in normal API responses.
2. Cluster and filter points in the client for subcounty scale.
3. Precompute ward summaries after synchronization instead of running expensive spatial joins on every map interaction.
4. Package a bounded Kilifi/Rabai offline tile region, not a country-wide cache.
5. Monitor tile bandwidth, database size, sync queue latency and PostGIS query duration before adding infrastructure.

## Production hardening sequence

1. Obtain authoritative Kilifi, Rabai and ward GeoJSON and import it through the boundary manager.
2. Assign GIS edit/verify permissions to existing roles and require a second user for verification where policy demands it.
3. Configure the online PostGIS generated geometry/index and server-side coverage endpoints for datasets that outgrow client analysis.
4. Configure a licensed or self-hosted satellite source if satellite imagery is operationally required.
5. Build and distribute a versioned Rabai offline tile package for desktop installations.
