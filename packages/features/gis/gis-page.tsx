"use client";

import dynamic from "next/dynamic";
import { MapPinned } from "lucide-react";
import { useFeatureData } from "../data/feature-data-context";

const GisMap = dynamic(() => import("./gis-map"), {
  ssr: false,
  loading: () => <div className="gis-map gis-map-loading">Loading Kilifi County map...</div>,
});

export default function GisPage() {
  const { schools, wards } = useFeatureData();

  return (
    <main className="content gis-page gis-map-page">
      <header className="gis-header">
        <div>
          <span>Kenya</span>
          <h1>Rabai Sub-County schools</h1>
          <p>Explore school locations within Rabai’s administrative wards.</p>
        </div>
        <div className="gis-county-summary">
          <MapPinned aria-hidden="true" />
          <span>
            <strong>Rabai Sub-County</strong>
            <small>Kilifi County, Kenya · 4 wards</small>
          </span>
        </div>
      </header>

      <nav className="gis-tabs" aria-label="GIS views">
        <span className="active" aria-current="page">Interactive map</span>
      </nav>

      <section className="gis-county-map-panel" aria-label="Kilifi County school map">
        <header className="gis-county-map-header">
          <div>
            <h2>Rabai school distribution</h2>
            <p>School points use recorded latitude and longitude.</p>
          </div>
          <div className="gis-county-map-legend" aria-label="Map legend">
            <span><i className="school" /> Schools</span>
            <span><i className="ward" /> Ward boundaries</span>
          </div>
        </header>
        <GisMap schools={schools} wards={wards} />
        <footer className="gis-map-attribution">
          Ward boundaries: Benedict Aboki Omare and George Omare, CC BY 4.0 · County boundary: geoBoundaries, public domain.
        </footer>
      </section>
    </main>
  );
}
