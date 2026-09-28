"use client";

import { useState } from "react";
import { TrendingUp } from "lucide-react";
import StatusBadge from "../ui/status-badge";

type AssessmentKey = "KCSE" | "KJSEA" | "KPSEA";

type AssessmentConfig = {
  key: AssessmentKey;
  label: string;
  fullName: string;
  color: string;
  years: number[];
  scores: number[];
  unit?: string;
};

const ASSESSMENTS: AssessmentConfig[] = [
  {
    key: "KCSE",
    label: "KCSE",
    fullName: "Kenya Certificate of Secondary Education",
    color: "#2563eb",
    years: [2023, 2024, 2025, 2026],
    scores: [6.42, 6.78, 7.05, 7.31],
    unit: "",
  },
  {
    key: "KJSEA",
    label: "KJSEA",
    fullName: "Kenya Junior School Education Assessment",
    color: "#16a34a",
    years: [2023, 2024, 2025, 2026],
    scores: [58.2, 61.4, 64.8, 68.5],
    unit: "%",
  },
  {
    key: "KPSEA",
    label: "KPSEA",
    fullName: "Kenya Primary School Education Assessment",
    color: "#d97706",
    years: [2023, 2024, 2025, 2026],
    scores: [62.1, 65.7, 69.3, 72.4],
    unit: "%",
  },
];

/**
 * MultiLineChart — single plot, multiple lines
 * All series share the same y-axis scale (0–80) so they can be compared directly.
 */
function MultiLineChart({
  datasets,
  width = 700,
  height = 340,
}: {
  datasets: AssessmentConfig[];
  width?: number;
  height?: number;
}) {
  // Shared y-domain: 0 to 80 covers all scores (KCSE 6–7.3, others 58–72.4)
  const yMin = 0;
  const yMax = 80;

  const padding = { top: 40, right: 30, bottom: 60, left: 70 };
  const innerW = width - padding.left - padding.right;
  const innerH = height - padding.top - padding.bottom;

  const years = datasets[0].years;

  const x = (i: number) => padding.left + (i / (years.length - 1)) * innerW;

  const y = (v: number) =>
    padding.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;

  // Grid lines every 10 units
  const gridValues = [0, 10, 20, 30, 40, 50, 60, 70, 80];

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      style={{ width: "100%", maxWidth: 820, height: "auto", display: "block" }}
      role="img"
      aria-label="Performance trends for KCSE, KJSEA and KPSEA"
    >
      {/* Horizontal grid lines + y-axis labels */}
      {gridValues.map((value) => {
        const gy = y(value);
        return (
          <g key={value}>
            <line
              x1={padding.left}
              x2={width - padding.right}
              y1={gy}
              y2={gy}
              stroke="var(--border, #e5e9f0)"
              strokeDasharray="4 4"
              strokeWidth={1}
            />
            <text
              x={padding.left - 10}
              y={gy + 4}
              textAnchor="end"
              fontSize={11}
              fill="var(--muted-foreground, #5c6f88)"
            >
              {value}
            </text>
          </g>
        );
      })}

      {/* Axis lines */}
      <line
        x1={padding.left}
        y1={padding.top}
        x2={padding.left}
        y2={height - padding.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />
      <line
        x1={padding.left}
        y1={height - padding.bottom}
        x2={width - padding.right}
        y2={height - padding.bottom}
        stroke="#cbd5e1"
        strokeWidth={1}
      />

      {/* One line per dataset */}
      {datasets.map((ds) => {
        const points = ds.scores.map((s, i) => `${x(i)},${y(s)}`).join(" ");
        return (
          <g key={ds.key}>
            <polyline
              points={points}
              fill="none"
              stroke={ds.color}
              strokeWidth={3}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Data points + value labels */}
            {ds.scores.map((s, i) => (
              <g key={`${ds.key}-${years[i]}`}>
                <circle
                  cx={x(i)}
                  cy={y(s)}
                  r={5}
                  fill="white"
                  stroke={ds.color}
                  strokeWidth={2.5}
                />
                <text
                  x={x(i)}
                  y={y(s) - 10}
                  textAnchor="middle"
                  fontSize={10}
                  fontWeight={600}
                  fill={ds.color}
                >
                  {s}
                  {ds.unit ?? ""}
                </text>
              </g>
            ))}
          </g>
        );
      })}

      {/* X-axis year labels */}
      {years.map((year, i) => (
        <text
          key={year}
          x={x(i)}
          y={height - 25}
          textAnchor="middle"
          fontSize={12}
          fontWeight={500}
          fill="var(--muted-foreground, #3e536b)"
        >
          {year}
        </text>
      ))}
    </svg>
  );
}

function TrendCard({
  config,
  active,
  onSelect,
}: {
  config: AssessmentConfig;
  active: boolean;
  onSelect: () => void;
}) {
  const first = config.scores[0];
  const last = config.scores[config.scores.length - 1];
  const delta = Number((last - first).toFixed(2));
  const pct = Number((((last - first) / first) * 100).toFixed(1));
  const unit = config.unit ?? "";

  return (
    <button
      type="button"
      className={`trend-card ${active ? "is-active" : ""}`}
      onClick={onSelect}
      style={{ ["--trend-color" as string]: config.color }}
    >
      <div className="trend-card-head">
        <div>
          <span className="trend-card-code">{config.label}</span>
          <h3>{config.fullName}</h3>
        </div>
        <span className="trend-card-delta trend-up">
          <TrendingUp />+{pct}%
        </span>
      </div>

      {/* Mini per-card chart — keep single line for card preview */}
      <svg
        className="trend-chart"
        viewBox="0 0 480 220"
        role="img"
        aria-label={`${config.label} trend`}
      >
        {(() => {
          const w = 480,
            h = 220;
          const pad = { top: 24, right: 24, bottom: 36, left: 44 };
          const iw = w - pad.left - pad.right;
          const ih = h - pad.top - pad.bottom;
          const min = Math.min(...config.scores);
          const max = Math.max(...config.scores);
          const range = max - min || 1;
          const pMin = min - range * 0.15;
          const pMax = max + range * 0.15;
          const pRange = pMax - pMin || 1;
          const x = (i: number) =>
            pad.left + (i / (config.years.length - 1)) * iw;
          const y = (v: number) => pad.top + ih - ((v - pMin) / pRange) * ih;
          const line = config.scores.map((s, i) => `${x(i)},${y(s)}`).join(" ");
          const area = [
            `${x(0)},${pad.top + ih}`,
            ...config.scores.map((s, i) => `${x(i)},${y(s)}`),
            `${x(config.scores.length - 1)},${pad.top + ih}`,
          ].join(" ");
          return (
            <>
              <polygon points={area} fill={config.color} opacity={0.1} />
              <polyline
                points={line}
                fill="none"
                stroke={config.color}
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {config.scores.map((s, i) => (
                <g key={config.years[i]}>
                  <circle
                    cx={x(i)}
                    cy={y(s)}
                    r={5}
                    fill="white"
                    stroke={config.color}
                    strokeWidth={2.5}
                  />
                  <text
                    x={x(i)}
                    y={y(s) - 12}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={config.color}
                  >
                    {s}
                    {unit}
                  </text>
                </g>
              ))}
              {config.years.map((yr, i) => (
                <text
                  key={yr}
                  x={x(i)}
                  y={h - 10}
                  textAnchor="middle"
                  fontSize={12}
                  fill="#6b7280"
                >
                  {yr}
                </text>
              ))}
            </>
          );
        })()}
      </svg>

      <div className="trend-card-foot">
        <div>
          <span>Latest ({config.years[config.years.length - 1]})</span>
          <strong>
            {last}
            {unit}
          </strong>
        </div>
        <div>
          <span>Change</span>
          <strong>
            +{delta}
            {unit}
          </strong>
        </div>
        <div>
          <span>Years</span>
          <strong>
            {config.years[0]}–{config.years[config.years.length - 1]}
          </strong>
        </div>
      </div>
    </button>
  );
}

export function PerformanceTrends() {
  const [selected, setSelected] = useState<AssessmentKey>("KCSE");
  const active = ASSESSMENTS.find((a) => a.key === selected)!;

  return (
    <div className="content">
      {/* Summary strip */}
      <section className="panel detail-panel report-overview-panel">
        <div className="panel-header">
          <div>
            <h2>Mean score by year</h2>
            <p>2023 – 2026 · All assessment types</p>
          </div>
          <StatusBadge status="Active" />
        </div>

        <div className="report-stat-grid report-overview-stat-grid">
          {ASSESSMENTS.map((a) => {
            const first = a.scores[0];
            const last = a.scores[a.scores.length - 1];
            const pct = (((last - first) / first) * 100).toFixed(1);
            const unit = a.unit ?? "";
            return (
              <div className="report-stat-card" key={a.key}>
                <span>{a.label} latest</span>
                <strong>
                  {last}
                  {unit} <em className="trend-inline-up">+{pct}%</em>
                </strong>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── UNIFIED CHART: one plot, three lines ─── */}
      <section className="panel detail-panel report-overview-panel">
        <div className="panel-header">
          <div>
            <h2>Performance trends · combined</h2>
            <p>KCSE, KJSEA &amp; KPSEA · 2023 – 2026 (shared scale)</p>
          </div>
          <StatusBadge status="Active" />
        </div>

        <MultiLineChart datasets={ASSESSMENTS} />

        {/* Legend */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "center",
            alignItems: "center",
            gap: "2rem",
            marginTop: "1rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            color: "#1f344b",
          }}
        >
          {ASSESSMENTS.map((a) => (
            <div
              key={a.key}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
            >
              <span
                style={{
                  width: "1rem",
                  height: "1rem",
                  borderRadius: 4,
                  background: a.color,
                  display: "inline-block",
                }}
              />
              {a.label}{" "}
              {a.unit ? `(${a.unit === "%" ? "%" : "score"})` : "(mean score)"}
            </div>
          ))}
        </div>
      </section>

      {/* Trend cards grid */}
      <div className="trend-card-grid">
        {ASSESSMENTS.map((config) => (
          <TrendCard
            key={config.key}
            config={config}
            active={config.key === selected}
            onSelect={() => setSelected(config.key)}
          />
        ))}
      </div>

      {/* Focused detail for selected assessment */}
      <section className="panel detail-panel report-overview-panel">
        <div className="panel-header">
          <div>
            <h2>{active.label} · multi-year breakdown</h2>
            <p>{active.fullName}</p>
          </div>
          <StatusBadge status="Active" />
        </div>

        <dl className="detail-list report-detail-list">
          {active.years
            .map((year, i) => [
              `${year} mean score`,
              `${active.scores[i]}${active.unit ?? ""}`,
            ])
            .map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          {[
            [
              "Overall change",
              `+${Number(
                (
                  active.scores[active.scores.length - 1] - active.scores[0]
                ).toFixed(2),
              )}${active.unit ?? ""}`,
            ],
            ["Assessment type", active.label],
            [
              "Coverage",
              `${active.years[0]} – ${active.years[active.years.length - 1]}`,
            ],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      </section>
    </div>
  );
}

export default PerformanceTrends;
