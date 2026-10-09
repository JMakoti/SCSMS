"use client";

import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { useFeatureData } from "../data/feature-data-context";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Columns3,
  Download,
  Filter,
  Plus,
  RefreshCw,
  Search,
  School,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import StatusBadge from "../ui/status-badge";
import PageHeader from "../ui/page-header";
import { schoolRegistryFilterSchema } from "../schemas/school-registry-filter-schema";
import {
  formatSchoolBoarding,
  formatSchoolClassification,
  formatSchoolGender,
  formatSchoolLevel,
  formatSchoolOwnership,
  formatSchoolRegistrationStatus,
  formatSchoolTitleDeed,
  getSchoolClassification,
  getSchoolLevel,
  getSchoolOwnership,
  getSchoolRegistrationStatus,
  getSchoolTitleDeed,
} from "../schools/school-display";

function SchoolsPage({
  onAdd,
  onProfile,
}: {
  onAdd: () => void;
  onProfile: (schoolId: string) => void;
}) {
  const { schools } = useFeatureData();
  type SchoolRegistryFilterValues = z.infer<typeof schoolRegistryFilterSchema>;
  const { register, reset, setValue, watch } =
    useForm<SchoolRegistryFilterValues>({
      resolver: zodResolver(schoolRegistryFilterSchema),
      defaultValues: {
        query: "",
        filter: "All",
        rowsPerPage: 25,
      },
    });
  const query = watch("query");
  const filter = watch("filter");
  const rowsPerPage = watch("rowsPerPage");
  const [selected, setSelected] = useState<string[]>([]);
  const [columns, setColumns] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [page, setPage] = useState(1);
  const schoolLevels: {
    label: string;
    value: SchoolRegistryFilterValues["filter"];
  }[] = [
    { label: "All", value: "All" },
    { label: "Primary", value: "PRIMARY" },
    { label: "Junior Secondary", value: "JUNIOR_SECONDARY" },
    { label: "Senior Secondary", value: "SENIOR_SECONDARY" },
    { label: "Integrated", value: "INTEGRATED" },
  ];
  const filtered = [...schools]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .filter(
      (s) =>
        (filter === "All" || s.institutionType === filter) &&
        `${s.displayName} ${s.officialName} ${s.schoolCode ?? ""} ${s.ward ?? ""} ${s.clusterLevel ?? ""} ${formatSchoolClassification(getSchoolClassification(s))} ${formatSchoolLevel(getSchoolLevel(s))} ${formatSchoolOwnership(getSchoolOwnership(s))} ${formatSchoolRegistrationStatus(getSchoolRegistrationStatus(s))}`
          .toLowerCase()
          .includes(query.toLowerCase()),
    );
  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage,
  );
  const pageStart =
    filtered.length === 0 ? 0 : (currentPage - 1) * rowsPerPage + 1;
  const pageEnd = Math.min(currentPage * rowsPerPage, filtered.length);
  const displayValue = (value: string | null | undefined) =>
    value && value.trim() ? value : "Not provided";

  useEffect(() => {
    setPage(1);
  }, [query, filter, rowsPerPage]);

  useEffect(() => {
    setPage(1);
  }, [schools.length]);

  const toggle = (id: string) =>
    setSelected((p) =>
      p.includes(id) ? p.filter((x) => x !== id) : [...p, id],
    );
  const getExportData = (rows = filtered) => {
    const headers = [
      "School Code",
      "School Name",
      "Official Name",
      "Institution Type",
      "Registration Status",
      "Level",
      "Ownership",
      "Cluster",
      "Gender",
      "Boarding",
      "Title Deed",
      "Ward",
      "Status",
    ];
    const body = rows.map((school) => [
      school.schoolCode ?? "",
      school.displayName,
      school.officialName,
      formatSchoolClassification(getSchoolClassification(school)),
      formatSchoolRegistrationStatus(getSchoolRegistrationStatus(school)),
      formatSchoolLevel(getSchoolLevel(school)),
      formatSchoolOwnership(getSchoolOwnership(school)),
      school.clusterLevel ? `Cluster ${school.clusterLevel}` : "",
      formatSchoolGender(school.genderType),
      formatSchoolBoarding(school.boardingType),
      formatSchoolTitleDeed(getSchoolTitleDeed(school)),
      school.ward ?? "",
      school.isActive ? "Active" : "Inactive",
    ]);

    return { headers, body };
  };
  const escapeHtml = (value: string) =>
    String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;");
  const buildExportTable = (rows = filtered) => {
    const { headers, body } = getExportData(rows);
    const headerHtml = headers
      .map((header) => `<th>${escapeHtml(header)}</th>`)
      .join("");
    const bodyHtml = body
      .map(
        (row) =>
          `<tr>${row
            .map((value) => `<td>${escapeHtml(String(value))}</td>`)
            .join("")}</tr>`,
      )
      .join("");

    return `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;
  };
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };
  const exportExcel = (rows = filtered) => {
    const workbook = `<!doctype html><html><head><meta charset="utf-8" /></head><body>${buildExportTable(rows)}</body></html>`;
    const blob = new Blob([workbook], {
      type: "application/vnd.ms-excel;charset=utf-8",
    });

    downloadBlob(
      blob,
      `rabai-schools-${new Date().toISOString().slice(0, 10)}.xls`,
    );
  };
  const exportPdf = (rows = filtered) => {
    const printWindow = window.open("", "_blank", "width=1024,height=768");

    if (!printWindow) {
      window.alert("Allow pop-ups to export this report as PDF.");
      return;
    }

    printWindow.document.write(`
      <!doctype html>
      <html>
        <head>
          <title>Rabai Schools Export</title>
          <style>
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1 { font-size: 20px; margin: 0 0 4px; }
            p { color: #64748b; font-size: 12px; margin: 0 0 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #dbe3ef; padding: 7px 8px; text-align: left; }
            th { background: #f8fafc; color: #334155; }
          </style>
        </head>
        <body>
          <h1>Rabai Schools</h1>
          <p>Generated ${new Date().toLocaleString()}</p>
          ${buildExportTable(rows)}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };
  const selectedRows = filtered.filter((school) =>
    selected.includes(school.id),
  );
  const reloadTable = () => {
    reset({ query: "", filter: "All", rowsPerPage: 25 });
    setSelected([]);
    setColumns(false);
    setFiltersOpen(false);
    setExportOpen(false);
    setPage(1);
  };

  return (
    <div className="content">
      <PageHeader
        title="Schools"
        description="Manage and maintain the official school registry"
        eyebrow="School Management / Registry"
        action={
          <Button className="edit-school-button" onClick={onAdd}>
            <Plus data-icon="inline-start" />
            Add School
          </Button>
        }
      />
      <div className="toolbar">
        <div className="toolbar-left">
          <div className="input-wrap table-search">
            <Search />
            <input
              {...register("query")}
              placeholder="Search by school name, code, ward..."
            />
          </div>
        </div>
        <div className="toolbar-right">
          <div className="filter-menu-wrap">
            <button
              className={`outline-button ${exportOpen ? "active-tool" : ""}`}
              type="button"
              onClick={() => setExportOpen((value) => !value)}
              aria-expanded={exportOpen}
            >
              <Download /> Export
            </button>
            {exportOpen && (
              <div className="school-filter-menu">
                <span>Export format</span>
                <button
                  type="button"
                  onClick={() => {
                    exportExcel();
                    setExportOpen(false);
                  }}
                >
                  Excel (.xls)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    exportPdf();
                    setExportOpen(false);
                  }}
                >
                  PDF
                </button>
              </div>
            )}
          </div>
          <button
            className={`outline-button ${columns ? "active-tool" : ""}`}
            onClick={() => setColumns(!columns)}
            type="button"
            aria-pressed={columns}
          >
            <Columns3 /> Columns
          </button>
          <div className="filter-menu-wrap">
            <button
              className={`outline-button ${filtersOpen ? "active-tool" : ""}`}
              onClick={() => setFiltersOpen((value) => !value)}
              type="button"
              aria-expanded={filtersOpen}
            >
              <Filter /> Filters
              {filter !== "All" && <span className="count-pill">1</span>}
            </button>
            {filtersOpen && (
              <div className="school-filter-menu">
                <span>Level</span>
                {schoolLevels.map((level) => (
                  <button
                    className={filter === level.value ? "selected" : ""}
                    key={level.value}
                    onClick={() => {
                      setValue("filter", level.value, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setFiltersOpen(false);
                    }}
                    type="button"
                  >
                    {level.label}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button
            className="icon-button border-button"
            type="button"
            onClick={reloadTable}
            aria-label="Reload schools table"
            title="Reload table"
          >
            <RefreshCw />
          </button>
        </div>
      </div>
      {selected.length > 0 && (
        <div className="bulk-bar">
          <span>{selected.length} selected</span>
          <button onClick={() => exportExcel(selectedRows)}>
            Export Excel
          </button>
          <button onClick={() => exportPdf(selectedRows)}>Export PDF</button>
          <button>Archive</button>
          <button className="close-bulk" onClick={() => setSelected([])}>
            <X />
          </button>
        </div>
      )}
      <div className="panel table-panel">
        <div className="table-meta">
          <span>
            Showing <b>{filtered.length}</b> of {schools.length} schools
            schools
          </span>
          <div className="table-meta-right">
            <span>Rows per page</span>
            <select {...register("rowsPerPage", { valueAsNumber: true })}>
              {[25, 50, 100].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th className="check-col">
                  <input
                    type="checkbox"
                    checked={
                      selected.length === filtered.length && filtered.length > 0
                    }
                    onChange={(e) =>
                      setSelected(
                        e.target.checked ? filtered.map((s) => s.id) : [],
                      )
                    }
                  />
                </th>
                <th>
                  School Code <ChevronDown />
                </th>
                <th>
                  School Name <ChevronDown />
                </th>
                <th>
                  Institution type <ChevronDown />
                </th>
                <th>
                  Level <ChevronDown />
                </th>
                <th>
                  Ownership <ChevronDown />
                </th>
                <th>
                  Cluster <ChevronDown />
                </th>
                {columns && (
                  <>
                    <th>
                      Gender <ChevronDown />
                    </th>
                    <th>
                      Boarding <ChevronDown />
                    </th>
                    <th>
                      Registration Status <ChevronDown />
                    </th>
                    <th>
                      Title deed <ChevronDown />
                    </th>
                    <th>
                      Ward <ChevronDown />
                    </th>
                  </>
                )}
                <th>Status</th>
                <th className="action-col"></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s) => (
                <tr key={s.id}>
                  <td className="check-col">
                    <input
                      type="checkbox"
                      checked={selected.includes(s.id)}
                      onChange={() => toggle(s.id)}
                    />
                  </td>
                  <td>
                    <button
                      className="code-link"
                      onClick={() => onProfile(s.id)}
                    >
                      {displayValue(s.schoolCode)}
                    </button>
                  </td>
                  <td>
                    <button
                      className="school-link"
                      onClick={() => onProfile(s.id)}
                    >
                      <span className="school-mini-icon">
                        <School />
                      </span>
                      {s.displayName}
                    </button>
                  </td>
                  <td>
                    {formatSchoolClassification(getSchoolClassification(s))}
                  </td>
                  <td>{formatSchoolLevel(getSchoolLevel(s))}</td>
                  <td>
                    <span className="type-label">
                      <span
                        className={`type-dot ${getSchoolOwnership(s)
                          .toLowerCase()
                          .replace(/[^a-z0-9]+/g, "-")}`}
                      />
                      {formatSchoolOwnership(getSchoolOwnership(s))}
                    </span>
                  </td>
                  <td>{s.clusterLevel ? `Cluster ${s.clusterLevel}` : "Not provided"}</td>
                  {columns && (
                    <>
                      <td>{formatSchoolGender(s.genderType)}</td>
                      <td>{formatSchoolBoarding(s.boardingType)}</td>
                      <td>
                        {formatSchoolRegistrationStatus(
                          getSchoolRegistrationStatus(s),
                        )}
                      </td>
                      <td>{formatSchoolTitleDeed(getSchoolTitleDeed(s))}</td>
                      <td>{displayValue(s.ward)}</td>
                    </>
                  )}
                  <td>
                    <StatusBadge status={s.isActive ? "Active" : "Inactive"} />
                  </td>
                  <td>
                    <button
                      className="row-action"
                      onClick={() => onProfile(s.id)}
                      aria-label={`View details for ${s.displayName}`}
                      title="View details"
                    >
                      View
                      <ChevronRight />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="empty-state">
              <Search />
              <strong>No schools found</strong>
              <span>There are no schools matching your current filters.</span>
              <button
                onClick={() => {
                  reset({ query: "", filter: "All", rowsPerPage });
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
        <div className="pagination">
          <span>
            Showing {pageStart}-{pageEnd} of {filtered.length} results
          </span>
          <div className="pages">
            <button
              disabled={currentPage === 1}
              onClick={() => setPage((value) => Math.max(1, value - 1))}
            >
              <ChevronLeft />
            </button>
            {Array.from({ length: totalPages }, (_, index) => index + 1)
              .filter(
                (pageNumber) =>
                  pageNumber === 1 ||
                  pageNumber === totalPages ||
                  Math.abs(pageNumber - currentPage) <= 1,
              )
              .map((pageNumber, index, pages) => (
                <span className="page-segment" key={pageNumber}>
                  {index > 0 && pageNumber - pages[index - 1] > 1 && (
                    <span>...</span>
                  )}
                  <button
                    className={currentPage === pageNumber ? "current" : ""}
                    onClick={() => setPage(pageNumber)}
                  >
                    {pageNumber}
                  </button>
                </span>
              ))}
            <button
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
    </div>
  );
}

export default SchoolsPage;
