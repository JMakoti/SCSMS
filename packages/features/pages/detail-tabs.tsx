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
import PerformanceContent from "../pages/performance-page";
import { EnrollmentGradeTable } from "../pages/enrollment-page";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import { useFeatureData, type FeatureData, type FeatureReport } from "../data/feature-data-context";
import { ExportMenu } from "../ui/export-menu";

function WardSchoolsTab({ ward }: { ward: string }) {
  const { currentAcademicYear } = useAcademicYear();
  const { schools, schoolYears } = useFeatureData();
  const [searchQuery, setSearchQuery] = useState("");
  const wardSchools = schools.filter((school) => school.ward === ward);
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
          const yearRecord = schoolYears.find(
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
                  {(yearRecord?.studentCount ?? 0).toLocaleString()} learners -{" "}
                  {(yearRecord?.teacherCount ?? 0).toLocaleString()} teachers
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

function getSchoolYear(
  data: FeatureData,
  schoolId: string,
  academicYearId: string,
) {
  return (
    data.schoolYears.find(
      (record) =>
        record.schoolId === schoolId &&
        record.academicYearId === academicYearId,
    ) ??
    data.schoolYears.find((record) => record.schoolId === schoolId) ??
    null
  );
}

function getReportDataset(
  data: FeatureData,
  reportKey: string,
  {
    academicYearId,
    ward = "All Wards",
  }: { academicYearId: string; ward?: string },
) {
  const allSchools = [...data.schools].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  const sortedSchools = allSchools
    .filter((school) => ward === "All Wards" || school.ward === ward)
    .sort((a, b) => a.displayName.localeCompare(b.displayName));
  const schoolRows = sortedSchools.map((school) => {
    const year = getSchoolYear(data, school.id, academicYearId);
    return [
      school.schoolCode ?? "Not provided",
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
      const year = getSchoolYear(data, school.id, academicYearId);
      return [
        school.displayName,
        formatSchoolValue(school.institutionType),
        school.ward ?? "Not mapped",
        String(year?.maleCount ?? 0),
        String(year?.femaleCount ?? 0),
        String(year?.studentCount ?? 0),
        year ? "Recorded" : "No enrollment record",
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
    const rows = data.staff
      .map((staff) => {
        const school = allSchools.find((entry) => entry.id === staff.schoolId);
        return [
          staff.id,
          staff.name,
          school?.displayName ?? "Not assigned",
          school?.ward ?? "Not mapped",
          staff.role,
          staff.type,
          staff.employmentType || "Not recorded",
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
      headers: ["Project", "School", "Year", "Term", "Status"],
      rows: data.infrastructureProjects.map((row) => [
        row.name,
        row.school,
        row.year,
        row.term,
        row.status,
      ]),
      metricValues: [
        data.infrastructureProjects.length.toLocaleString(),
        data.infrastructureFacilities.reduce((sum, row) => sum + row.available, 0).toLocaleString(),
        data.infrastructureFacilities.reduce((sum, row) => sum + row.needsRepair, 0).toLocaleString(),
        data.infrastructureProjects
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
        .map((school) => getSchoolYear(data, school.id, academicYearId))
        .filter(Boolean);
      const students = yearRows.reduce(
        (sum, row) => sum + (row?.studentCount ?? 0),
        0,
      );
      const teaching = yearRows.reduce(
        (sum, row) => sum + (row?.teacherCount ?? 0),
        0,
      );
      const schoolIds = new Set(wardSchools.map((school) => school.id));
      const nonTeaching = data.staff.filter(
        (member) =>
          schoolIds.has(member.schoolId) && member.type === "Non-teaching",
      ).length;
      return [
        ward ?? "Not mapped",
        String(wardSchools.length),
        students.toLocaleString(),
        teaching.toLocaleString(),
        nonTeaching.toLocaleString(),
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
  report: FeatureReport;
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
  const visualTitle = `${report.title} summary`;
  const metricLabels = [
    "Records",
    "Schools",
    "Students",
    "Staff",
  ];

  useEffect(() => {
    setPage(1);
  }, [report.key, rows.length, selectedWard]);

  return (
    <div className="report-preview-body">
      <div className="report-stat-grid">
        {metricLabels.map((metric, index) => (
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
          {report.key === "school-register" || report.key === "ward-summary" ? (
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
              <strong>
                {dataset.metricValues.length
                  ? `${Math.round(
                      dataset.metricValues.reduce(
                        (sum, value) =>
                          sum +
                          Number(String(value).replace("%", "")),
                        0,
                      ) / dataset.metricValues.length,
                    )}%`
                  : "0%"}
              </strong>
              <span>Overall Quality</span>
            </div>
          ) : dataset.metricValues.length > 0 ? (
            <div className="report-bar-preview">
              {dataset.metricValues.slice(0, 5).map((value, index) => {
                const numberValue = Number(String(value).replace(/,/g, "").replace("%", ""));
                const maxValue = Math.max(
                  1,
                  ...dataset.metricValues.map((entry) =>
                    Number(String(entry).replace(/,/g, "").replace("%", "")),
                  ),
                );
                return <span key={`${value}-${index}`} style={{ height: `${Math.max(8, (numberValue / maxValue) * 100)}%` }}>
                  <i>{index + 1}</i>
                </span>;
              })}
            </div>
          ) : (
            <div className="report-donut-preview">
              <strong>0</strong>
              <span>No data</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TrendsTab({ school }: { school: string }) {
  const { performanceRecords } = useFeatureData();
  const schoolRecords = performanceRecords
    .filter((record) => record.school === school)
    .sort((a, b) => a.year.localeCompare(b.year));
  const assessment = schoolRecords[0]?.assessmentType || "Assessment";
  const chartData = schoolRecords
    .filter((record) => record.averageScore !== null)
    .map((record) => ({
      year: record.year,
      mean: record.averageScore ?? 0,
    }));
  const latest = chartData[chartData.length - 1]?.mean ?? 0;
  const previous = chartData[chartData.length - 2]?.mean ?? latest;
  const change = latest - previous;
  const average = chartData.length
    ? chartData.reduce((sum, value) => sum + value.mean, 0) / chartData.length
    : 0;
  const formattedChange = change.toFixed(1);
  const formattedAverage = average.toFixed(1);
  const formattedLatest = latest.toFixed(1);

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
              "Measured against the recorded assessment scale",
            ],
            ["Average", formattedAverage, `${chartData.length} recorded assessments`],
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
              {chartData.length
                ? `${chartData[0].year} - ${chartData[chartData.length - 1].year}`
                : "No assessment history"}
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
                  domain={["auto", "auto"]}
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
  const { academicYears, currentAcademicYear } = useAcademicYear();
  const featureData = useFeatureData();
  const detail = featureData.reportTemplates.find(
    (template) => template.key === report || template.title === report,
  ) ?? {
    id: "",
    key: report,
    title: report,
    code: "",
    category: "",
    description: "",
    frequency: "",
    recordsIncluded: 0,
    lastGenerated: null,
    status: "Not configured",
  };
  const SelectedIcon = getReportIcon(detail.key);
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState(
    currentAcademicYear.id,
  );
  const [selectedWard, setSelectedWard] = useState("All Wards");
  const dataset = getReportDataset(featureData, detail.key, {
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
              {featureData.wards.length > 0 && (
                <select
                  aria-label="Ward filter"
                  value={selectedWard}
                  onChange={(event) => setSelectedWard(event.target.value)}
                >
                  <option value="All Wards">All Wards</option>
                  {featureData.wards.map((ward) => (
                    <option key={ward.wardCode ?? ward.name} value={ward.name}>
                      {ward.name}
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
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
}: {
  active: string;
  item: string;
  onTabChange?: (tab: string) => void;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
  const [tab, setTab] = useState("Overview");
  const [termId, setTermId] = useState("");
  const { currentAcademicYear } = useAcademicYear();
  const { performanceRecords, academicYears, terms } = useFeatureData();
  const currentYearTerms = terms.filter(
    (entry) => entry.academicYearId === currentAcademicYear.id,
  );
  const selectedTerm =
    currentYearTerms.find((entry) => entry.id === termId) ??
    currentYearTerms[0] ??
    null;
  const assessmentTab =
    performanceRecords.find((record) => record.school === item)
      ?.assessmentName ?? "Assessment";
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
        <InfrastructureContent
          detail
          school={item}
          onSaveFacility={onSaveInfrastructureFacility}
        />
      )}
      {tab === "Contacts" && <SchoolContactsContent school={item} />}
      {tab === "Enrollment" && active === "Schools" && (
        <div className="enrollment-tab-content">
          <div className="term-cards">
            {currentYearTerms.map((termRecord) => (
              <button
                key={termRecord.id}
                className={`term-card ${selectedTerm?.id === termRecord.id ? "active" : ""}`}
                onClick={() => setTermId(termRecord.id)}
              >
                <span className="term-card-check">
                  {selectedTerm?.id === termRecord.id ? "✓" : ""}
                </span>
                <span>
                  <strong>{termRecord.name}</strong>
                  <small>{currentAcademicYear.name}</small>
                </span>
                <b>{selectedTerm?.id === termRecord.id ? "Current" : "Select"}</b>
              </button>
            ))}
            {currentYearTerms.length === 0 && (
              <p>No terms are configured for {currentAcademicYear.name}.</p>
            )}
          </div>
          <EnrollmentGradeTable
            school={item}
            term={selectedTerm?.name ?? "All terms"}
            termId={selectedTerm?.id}
            onSaveGrade={onSaveEnrollmentGrade}
          />
        </div>
      )}
      {tab === "Enrollment" && active !== "Schools" && (
        <div className="enrollment-tab-content">
          <div className="term-cards">
            {currentYearTerms.map((termRecord) => (
              <button
                key={termRecord.id}
                className={`term-card ${selectedTerm?.id === termRecord.id ? "active" : ""}`}
                onClick={() => setTermId(termRecord.id)}
              >
                <span className="term-card-check">
                  {selectedTerm?.id === termRecord.id ? "✓" : ""}
                </span>
                <span>
                  <strong>{termRecord.name}</strong>
                  <small>{currentAcademicYear.name}</small>
                </span>
                <b>{selectedTerm?.id === termRecord.id ? "Current" : "Select"}</b>
              </button>
            ))}
            {currentYearTerms.length === 0 && (
              <p>No terms are configured for {currentAcademicYear.name}.</p>
            )}
          </div>
          <EnrollmentGradeTable
            school={item}
            term={selectedTerm?.name ?? "All terms"}
            termId={selectedTerm?.id}
            onSaveGrade={onSaveEnrollmentGrade}
          />
        </div>
      )}
    </>
  );
}
