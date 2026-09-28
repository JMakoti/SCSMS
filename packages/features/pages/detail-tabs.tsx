"use client";

import { useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Building2,
  ChevronLeft,
  ChevronRight,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  School,
  Users,
} from "lucide-react";
import { useAcademicYear } from "../academic-years/academic-year-context";
import StatusBadge from "../ui/status-badge";
import SchoolContactsContent from "../pages/contacts-page";
import InfrastructureContent from "../pages/infrastructure-page";
import PerformanceContent, {
  getSchoolAssessment,
} from "../pages/performance-page";
import { EnrollmentGradeTable } from "../pages/enrollment-page";
import {
  getRabaiSchoolsByWard,
  rabaiSchools,
  rabaiSchoolYears,
  rabaiWards,
} from "../../../database/seeders/rabai-schools";
import { getReportDetail } from "../../../database/seeders/reports";
import { staffRecords } from "../../../database/seeders/staff";
import { infrastructureFacilityRows } from "../../../database/seeders/infrastructure";
import { academicYears } from "../../../database/seeders/academic-years";
import { ExportMenu } from "../ui/export-menu";

function WardSchoolsTab({ ward }: { ward: string }) {
  const { currentAcademicYear } = useAcademicYear();
  const [searchQuery, setSearchQuery] = useState("");
  const wardSchools = getRabaiSchoolsByWard(ward);
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredSchools = normalizedQuery
    ? wardSchools.filter((school) =>
        [
          school.displayName,
          school.schoolCode,
          school.institutionType,
          school.ownershipType,
          school.location,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery),
      )
    : wardSchools;

  return (
    <section className="panel module-table">
      <div className="panel-header">
        <div>
          <h2>Schools in {ward}</h2>
          <p>
            {filteredSchools.length} of {wardSchools.length} schools shown
          </p>
        </div>
        <div className="input-wrap compact-search">
          <Search />
          <input
            placeholder="Search records..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
          />
        </div>
      </div>
      <div className="module-rows">
        {filteredSchools.map((school) => {
          const yearRecord = rabaiSchoolYears.find(
            (record) =>
              record.schoolId === school.id &&
              record.academicYearId === currentAcademicYear.id,
          );

          return (
            <div className="module-row" key={school.id}>
              <div className="row-icon">
                <School />
              </div>
              <div className="row-main">
                <strong>{school.displayName}</strong>
                <span>
                  {school.schoolCode ?? "No code"} -{" "}
                  {school.institutionType.replaceAll("_", " ")} -{" "}
                  {school.ownershipType} -{" "}
                  {(yearRecord?.studentCount ?? 0).toLocaleString()} demo
                  learners - {(yearRecord?.teacherCount ?? 0).toLocaleString()}{" "}
                  demo teachers
                </span>
              </div>
              <StatusBadge status={school.isActive ? "Active" : "Inactive"} />
            </div>
          );
        })}
        {filteredSchools.length === 0 && (
          <div className="module-row">
            <div className="row-icon">
              <Search />
            </div>
            <div className="row-main">
              <strong>No schools found</strong>
              <span>
                Try a different school name, code, level, or ownership type.
              </span>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function getReportIcon(reportKey: string) {
  const icons = {
    "school-register": Building2,
    enrollment: GraduationCap,
    staff: Users,
    infrastructure: FileBarChart2,
    "ward-summary": MapPin,
    "school-type": FileSpreadsheet,
    "data-quality": AlertTriangle,
  };

  return icons[reportKey as keyof typeof icons] ?? FileText;
}

function formatSchoolValue(value: string | null | undefined) {
  return value
    ? value
        .toLowerCase()
        .split("_")
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ")
    : "Not provided";
}

function getSchoolYear(schoolId: string, academicYearId = "ay-2026") {
  return (
    rabaiSchoolYears.find(
      (record) =>
        record.schoolId === schoolId &&
        record.academicYearId === academicYearId,
    ) ??
    rabaiSchoolYears.find((record) => record.schoolId === schoolId) ??
    null
  );
}

function getReportDataset(
  reportKey: string,
  {
    academicYearId = "ay-2026",
    ward = "All Wards",
  }: { academicYearId?: string; ward?: string } = {},
) {
  const allSchools = [...rabaiSchools].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  const sortedSchools = allSchools
    .filter((school) => ward === "All Wards" || school.ward === ward)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const schoolRows = sortedSchools.map((school, index) => {
    const year = getSchoolYear(school.id, academicYearId);
    return [
      school.schoolCode ?? `SCH-${String(index + 1).padStart(4, "0")}`,
      school.displayName,
      formatSchoolValue(school.institutionType),
      formatSchoolValue(school.ownershipType),
      school.ward ?? "Not mapped",
      String(year?.studentCount ?? 0),
      String(year?.teacherCount ?? 0),
      school.isActive ? "Active" : "Inactive",
    ];
  });

  if (reportKey === "enrollment") {
    const rows = sortedSchools.map((school) => {
      const year = getSchoolYear(school.id, academicYearId);
      const total = year?.studentCount ?? 0;
      const boys = Math.round(total * 0.51);
      const girls = total - boys;
      return [
        school.displayName,
        formatSchoolValue(school.institutionType),
        school.ward ?? "Not mapped",
        String(boys),
        String(girls),
        String(total),
        year?.status === "CLOSED" ? "Closed year" : "Active year",
      ];
    });
    return {
      headers: [
        "School",
        "Level",
        "Ward",
        "Boys",
        "Girls",
        "Total Learners",
        "Year Status",
      ],
      rows,
      metricValues: [
        rows.length.toLocaleString(),
        rows.reduce((sum, row) => sum + Number(row[3]), 0).toLocaleString(),
        rows.reduce((sum, row) => sum + Number(row[4]), 0).toLocaleString(),
        rows.reduce((sum, row) => sum + Number(row[5]), 0).toLocaleString(),
      ],
    };
  }

  if (reportKey === "staff") {
    const rows = staffRecords
      .map((staff, index) => {
        const school = allSchools.length
          ? allSchools[index % allSchools.length]
          : null;
        return [
          `STF-${String(index + 12).padStart(3, "0")}`,
          staff.name,
          school?.displayName ?? "Not assigned",
          school?.ward ?? "Not mapped",
          staff.role,
          staff.type,
          index % 3 === 0 ? "Permanent" : "Contract",
          staff.status,
        ];
      })
      .filter((row) => ward === "All Wards" || row[3] === ward);
    return {
      headers: [
        "Staff ID",
        "Name",
        "School",
        "Ward",
        "Designation",
        "Staff Type",
        "Employment Type",
        "Status",
      ],
      rows,
      metricValues: [
        rows.length.toLocaleString(),
        rows.filter((row) => row[5] === "Teaching").length.toLocaleString(),
        rows.filter((row) => row[5] === "Non-teaching").length.toLocaleString(),
        new Set(rows.map((row) => row[2])).size.toLocaleString(),
      ],
    };
  }

  if (reportKey === "infrastructure") {
    return {
      headers: ["Facility", "Available", "Good", "Needs Repair", "Status"],
      rows: infrastructureFacilityRows.map((row) => [
        row.facility,
        row.available,
        row.good,
        row.needsRepair,
        row.status,
      ]),
      metricValues: [
        infrastructureFacilityRows
          .reduce((sum, row) => sum + Number(row.available), 0)
          .toLocaleString(),
        infrastructureFacilityRows
          .reduce((sum, row) => sum + Number(row.good), 0)
          .toLocaleString(),
        infrastructureFacilityRows
          .reduce((sum, row) => sum + Number(row.needsRepair), 0)
          .toLocaleString(),
        infrastructureFacilityRows
          .filter((row) => row.status === "Completed")
          .length.toLocaleString(),
      ],
    };
  }

  if (reportKey === "ward-summary") {
    const wards = Array.from(
      new Set(sortedSchools.map((school) => school.ward)),
    );
    const rows = wards.map((ward) => {
      const wardSchools = sortedSchools.filter(
        (school) => school.ward === ward,
      );
      const yearRows = wardSchools
        .map((school) => getSchoolYear(school.id, academicYearId))
        .filter(Boolean);
      const students = yearRows.reduce(
        (sum, row) => sum + (row?.studentCount ?? 0),
        0,
      );
      const teaching = yearRows.reduce(
        (sum, row) => sum + (row?.teacherCount ?? 0),
        0,
      );
      return [
        ward ?? "Not mapped",
        String(wardSchools.length),
        students.toLocaleString(),
        teaching.toLocaleString(),
        Math.round(teaching * 0.22).toLocaleString(),
      ];
    });
    return {
      headers: ["Ward", "Schools", "Students", "Teaching", "Non-Teaching"],
      rows,
      metricValues: [
        rows.length.toLocaleString(),
        sortedSchools.length.toLocaleString(),
        rows
          .reduce((sum, row) => sum + Number(row[2].replace(/,/g, "")), 0)
          .toLocaleString(),
        rows
          .reduce((sum, row) => sum + Number(row[3].replace(/,/g, "")), 0)
          .toLocaleString(),
      ],
    };
  }

  if (reportKey === "school-type") {
    const types = Array.from(
      new Set(sortedSchools.map((school) => school.institutionType)),
    );
    const rows = types.map((type) => {
      const count = sortedSchools.filter(
        (school) => school.institutionType === type,
      ).length;
      return [
        formatSchoolValue(type),
        String(count),
        `${
          sortedSchools.length
            ? Math.round((count / sortedSchools.length) * 100)
            : 0
        }%`,
      ];
    });
    return {
      headers: ["School Type", "Schools", "Share"],
      rows,
      metricValues: rows.map((row) => row[1]).slice(0, 4),
    };
  }

  if (reportKey === "data-quality") {
    const checks = [
      ["Has school code", sortedSchools.filter((school) => school.schoolCode)],
      ["Has phone number", sortedSchools.filter((school) => school.phone)],
      ["Has email address", sortedSchools.filter((school) => school.email)],
      [
        "Has ward mapping",
        sortedSchools.filter((school) => school.ward && school.ward !== ""),
      ],
    ] as const;
    const rows = checks.map(([label, passed]) => [
      label,
      String(passed.length),
      String(sortedSchools.length),
      `${
        sortedSchools.length
          ? Math.round((passed.length / sortedSchools.length) * 100)
          : 0
      }%`,
    ]);
    return {
      headers: ["Check", "Passed", "Total", "Completion"],
      rows,
      metricValues: rows.map((row) => row[3]).slice(0, 4),
    };
  }

  return {
    headers: [
      "Code",
      "Name",
      "Level",
      "Ownership",
      "Ward",
      "Students",
      "Staff",
      "Status",
    ],
    rows: schoolRows,
    metricValues: [
      sortedSchools.length.toLocaleString(),
      sortedSchools
        .filter((school) => school.institutionType === "PRIMARY")
        .length.toLocaleString(),
      sortedSchools
        .filter((school) => school.institutionType !== "PRIMARY")
        .length.toLocaleString(),
      schoolRows.reduce((sum, row) => sum + Number(row[5]), 0).toLocaleString(),
    ],
  };
}

function ReportPreviewBody({
  report,
  dataset,
  selectedWard,
}: {
  report: ReturnType<typeof getReportDetail>;
  dataset: ReturnType<typeof getReportDataset>;
  selectedWard: string;
}) {
  const rows = dataset.rows;
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleRows = rows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const wardDistribution = Array.from(
    rows.reduce((map, row) => {
      const ward = String(row[4] ?? "Not mapped");
      map.set(ward, (map.get(ward) ?? 0) + 1);
      return map;
    }, new Map<string, number>()),
  );
  const maxWardCount = Math.max(
    1,
    ...wardDistribution.map(([, count]) => count),
  );
  const visualTitle =
    report.key === "school-register"
      ? "Schools by ward"
      : report.visualizations[0];

  useEffect(() => {
    setPage(1);
  }, [report.key, rows.length, selectedWard]);

  return (
    <div className="report-preview-body">
      <div className="report-stat-grid">
        {report.metrics.slice(0, 4).map((metric, index) => (
          <div className="report-stat-card" key={metric}>
            <span>{metric}</span>
            <strong>{dataset.metricValues[index] ?? "0"}</strong>
            <small>
              {index === 0 ? "Filtered records" : "Current selection"}
            </small>
          </div>
        ))}
      </div>
      <div className="report-preview-content">
        <div className="report-preview-table-wrap">
          <div className="report-table-headline">
            <div>
              <h3>Report rows</h3>
              <p>
                {rows.length.toLocaleString()} records match the active filters
              </p>
            </div>
            <span>{pageSize} per page</span>
          </div>
          <table className="report-preview-table">
            <thead>
              <tr>
                {dataset.headers.slice(0, 5).map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.join("-")}>
                  {row.slice(0, 5).map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <div className="pagination report-table-pagination">
            <span>
              Showing {(currentPage - 1) * pageSize + 1}-
              {Math.min(currentPage * pageSize, rows.length)} of {rows.length}{" "}
              rows
            </span>
            <div className="page-buttons">
              <button
                aria-label="Previous report rows"
                disabled={currentPage === 1}
                onClick={() => setPage((value) => Math.max(1, value - 1))}
              >
                <ChevronLeft />
              </button>
              {Array.from({ length: totalPages }, (_, index) => index + 1).map(
                (pageNumber) => (
                  <button
                    className={currentPage === pageNumber ? "current" : ""}
                    key={pageNumber}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                ),
              )}
              <button
                aria-label="Next report rows"
                disabled={currentPage === totalPages}
                onClick={() =>
                  setPage((value) => Math.min(totalPages, value + 1))
                }
              >
                <ChevronRight />
              </button>
            </div>
          </div>
        </div>
        <div className="report-visual-card">
          <h3>{visualTitle}</h3>
          {report.key === "school-register" ? (
            <div className="report-ward-chart">
              {wardDistribution.map(([ward, count]) => (
                <span key={ward}>
                  <b>{ward}</b>
                  <i>
                    <em
                      style={{
                        width: `${Math.max(8, (count / maxWardCount) * 100)}%`,
                      }}
                    />
                  </i>
                  <strong>{count}</strong>
                </span>
              ))}
            </div>
          ) : report.key === "data-quality" ? (
            <div className="report-progress-ring">
              <strong>92%</strong>
              <span>Overall Quality</span>
            </div>
          ) : report.visualizations[0]?.toLowerCase().includes("bar") ? (
            <div className="report-bar-preview">
              {[82, 64, 74, 58, 91].map((value, index) => (
                <span key={value} style={{ height: `${value}%` }}>
                  <i>{index + 1}</i>
                </span>
              ))}
            </div>
          ) : (
            <div className="report-donut-preview">
              <strong>{report.key === "school-type" ? "76%" : "68%"}</strong>
              <span>{report.visualizations[0]}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendsTab({ school }: { school: string }) {
  const assessment = getSchoolAssessment(school);
  const values =
    assessment === "KCSE"
      ? [6.4, 6.7, 7, 7.3]
      : assessment === "KJSEA"
        ? [57, 61, 65, 69]
        : [60, 64, 68, 72];
  const chartData = values.map((mean, index) => ({
    year: String(2023 + index),
    mean,
  }));
  const latest = values[values.length - 1];
  const previous = values[values.length - 2] ?? latest;
  const change = latest - previous;
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const scoreUnit = assessment === "KCSE" ? "points" : "%";
  const formattedChange =
    assessment === "KCSE" ? change.toFixed(1) : `${Math.round(change)}%`;
  const formattedAverage =
    assessment === "KCSE" ? average.toFixed(1) : `${Math.round(average)}%`;
  const formattedLatest =
    assessment === "KCSE" ? latest.toFixed(1) : `${Math.round(latest)}%`;

  return (
    <section className="panel detail-panel performance-overview performance-overview-light">
      <header className="performance-overview-heading">
        <h2>{assessment} Trends</h2>
        <p>Mean score against the year of the exam</p>
      </header>
      <section className="performance-trend-panel trends-line-panel">
        <div className="performance-section-title trends-chart-heading">
          <div>
            <h3>Mean score by year</h3>
            <p>Historical {assessment} examination performance</p>
          </div>
          <span className="trend-axis-note">
            Y-axis: Mean score / X-axis: Exam year
          </span>
        </div>
        <div className="trend-summary-grid">
          {[
            ["Current mean", formattedLatest, "Latest exam year"],
            [
              "Year change",
              `${change >= 0 ? "+" : ""}${formattedChange}`,
              `Measured in ${scoreUnit}`,
            ],
            ["Four-year average", formattedAverage, "Across 2023-2026"],
          ].map(([label, value, note]) => (
            <div className="trend-summary-card" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
              <small>{note}</small>
            </div>
          ))}
        </div>
        <div className="trend-chart-shell">
          <div className="trend-chart-legend">
            <span>
              <i className="trend-legend-dot" aria-hidden="true" />
              Mean score
            </span>
            <b>
              {chartData[0].year} - {chartData[chartData.length - 1].year}
            </b>
          </div>
          <div className="trend-chart-canvas h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{ top: 18, right: 22, left: 0, bottom: 10 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#dce5ef"
                  strokeDasharray="3 7"
                />
                <XAxis
                  dataKey="year"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={10}
                />
                <YAxis
                  domain={assessment === "KCSE" ? [6, 8] : [50, 80]}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={42}
                />
                <Tooltip
                  cursor={{
                    stroke: "#2563eb",
                    strokeDasharray: "4 4",
                  }}
                  formatter={(value) => [value ?? 0, "Mean score"]}
                />
                <Line
                  dataKey="mean"
                  type="monotone"
                  stroke="#2563eb"
                  strokeWidth={4}
                  dot={{
                    r: 5,
                    fill: "#ffffff",
                    stroke: "#2563eb",
                    strokeWidth: 2,
                  }}
                  activeDot={{
                    r: 7,
                    fill: "#2563eb",
                    stroke: "#ffffff",
                    strokeWidth: 2,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </section>
  );
}

function ReportInformationTab({ report }: { report: string }) {
  const { currentAcademicYear } = useAcademicYear();
  const detail = getReportDetail(report);
  const SelectedIcon = getReportIcon(detail.key);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(
    currentAcademicYear.id,
  );
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const dataset = getReportDataset(detail.key, {
    academicYearId: selectedAcademicYearId,
    ward: selectedWard,
  });
  const selectedAcademicYear =
    academicYears.find((year) => year.id === selectedAcademicYearId) ??
    currentAcademicYear;

  return (
    <section className="report-workspace single-report-workspace">
      <div className="report-workspace-main">
        <div className="report-info-panel">
          <div className="report-info-hero">
            <span className="report-toolbar-icon">
              <SelectedIcon />
            </span>
            <div className="report-toolbar-title">
              <span className="eyebrow">Report information</span>
              <h2>{detail.title}</h2>
              <p>{detail.description}</p>
            </div>
            <div className="report-info-status">
              <span>{detail.status}</span>
              <strong>{dataset.rows.length.toLocaleString()} rows</strong>
            </div>
          </div>
          <div className="report-toolbar-card">
            <div className="report-toolbar-title">
              <h3>Report controls</h3>
              <p>
                {selectedWard} / {selectedAcademicYear.name}
              </p>
            </div>
            <div className="report-toolbar-actions">
              {(detail.key === "enrollment" ||
                detail.key === "ward-summary") && (
                <select
                  aria-label="Academic year"
                  value={selectedAcademicYearId}
                  onChange={(event) =>
                    setSelectedAcademicYearId(event.target.value)
                  }
                >
                  {academicYears.map((year) => (
                    <option key={year.id} value={year.id}>
                      {year.name}
                    </option>
                  ))}
                </select>
              )}
              {detail.filters.includes("Ward") && (
                <select
                  aria-label="Ward filter"
                  value={selectedWard}
                  onChange={(event) => setSelectedWard(event.target.value)}
                >
                  <option value="All Wards">All Wards</option>
                  {rabaiWards.map((ward) => (
                    <option key={ward.wardCode} value={ward.wardName}>
                      {ward.wardName}
                    </option>
                  ))}
                </select>
              )}
              <button>
                <RefreshCw /> Refresh
              </button>
              <ExportMenu
                title={`${detail.title} - ${selectedWard} - ${selectedAcademicYear.name}`}
                filename={`${detail.key}-${selectedWard.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${selectedAcademicYear.name}`}
                headers={dataset.headers}
                rows={dataset.rows}
              />
              <button>
                <Printer /> Print
              </button>
            </div>
          </div>
          <div className="report-preview-card">
            <ReportPreviewBody
              report={detail}
              dataset={dataset}
              selectedWard={selectedWard}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export function DetailTabs({
  active,
  item,
  onTabChange,
}: {
  active: string;
  item: string;
  onTabChange?: (tab: string) => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [term, setTerm] = useState("Term 1");
  const assessmentTab = getSchoolAssessment(item);
  useEffect(() => {
    if (
      active === "School Performance" &&
      !["Overview", assessmentTab, "Trends"].includes(tab)
    ) {
      setTab("Overview");
    }
  }, [active, assessmentTab, tab]);
  const tabs =
    active === "Enrollment"
      ? ["Overview", "Enrollment"]
      : active === "Schools"
        ? ["Overview", "Staff"]
        : active === "Infrastructure"
          ? ["Overview", "Infrastructure"]
          : active === "School Contacts"
            ? ["Overview", "Contacts"]
            : active === "Ward"
              ? ["Overview", "Schools"]
              : active === "Reports"
                ? ["Overview", "Report information"]
                : active === "School Performance"
                  ? ["Overview", assessmentTab, "Trends"]
                  : ["Overview"];

  const selectTab = (nextTab: string) => {
    setTab(nextTab);
    onTabChange?.(nextTab);
  };

  return (
    <>
      <div className="profile-tabs">
        {tabs.map((tabName) => (
          <button
            key={tabName}
            className={tab === tabName ? "active" : ""}
            onClick={() => selectTab(tabName)}
          >
            {tabName}
          </button>
        ))}
      </div>
      {active === "School Performance" && tab === "Trends" && (
        <TrendsTab school={item} />
      )}
      {active === "School Performance" &&
        (tab === "Overview" || tab === assessmentTab) && (
          <PerformanceContent
            detail
            school={item}
            overview={tab === "Overview"}
          />
        )}

      {tab === "Schools" && active === "Ward" && <WardSchoolsTab ward={item} />}
      {tab === "Report information" && active === "Reports" && (
        <ReportInformationTab report={item} />
      )}
      {tab === "Infrastructure" && (
        <InfrastructureContent detail school={item} />
      )}
      {tab === "Contacts" && <SchoolContactsContent school={item} />}
      {tab === "Enrollment" && active === "Schools" && (
        <div className="enrollment-tab-content">
          <div className="term-cards">
            {["Term 1", "Term 2", "Term 3"].map((termName) => (
              <button
                key={termName}
                className={`term-card ${term === termName ? "active" : ""}`}
                onClick={() => setTerm(termName)}
              >
                <span className="term-card-check">
                  {term === termName ? "✓" : ""}
                </span>
                <span>
                  <strong>{termName}</strong>
                  <small>Academic Year 2026</small>
                </span>
                <b>{term === termName ? "Current" : "Select"}</b>
              </button>
            ))}
          </div>
          <EnrollmentGradeTable school={item} term={term} />
        </div>
      )}
      {tab === "Enrollment" && active !== "Schools" && (
        <div className="enrollment-tab-content">
          <div className="term-cards">
            {["Term 1", "Term 2", "Term 3"].map((termName) => (
              <button
                key={termName}
                className={`term-card ${term === termName ? "active" : ""}`}
                onClick={() => setTerm(termName)}
              >
                <span className="term-card-check">
                  {term === termName ? "✓" : ""}
                </span>
                <span>
                  <strong>{termName}</strong>
                  <small>Academic Year 2026</small>
                </span>
                <b>{term === termName ? "Current" : "Select"}</b>
              </button>
            ))}
          </div>
          <EnrollmentGradeTable school={item} term={term} />
        </div>
      )}
    </>
  );
}
