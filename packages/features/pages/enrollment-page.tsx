"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  School,
  Search,
  Users,
  X,
} from "lucide-react";
import { useAcademicYear } from "../academic-years/academic-year-context";
import PageHeader from "../ui/page-header";
import { ExportMenu } from "../ui/export-menu";
import {
  enrollmentGradeBands,
  enrollmentGradeRows,
} from "../data/fixtures/enrollment";
import { rabaiSchools, rabaiSchoolYears } from "../data/fixtures/rabai-schools";

const sortedRabaiSchools = [...rabaiSchools].sort((a, b) =>
  a.displayName.localeCompare(b.displayName),
);

function getEnrollmentSchoolType(institutionType: string) {
  return institutionType === "JUNIOR_SECONDARY"
    ? "Junior"
    : institutionType === "SENIOR_SECONDARY"
      ? "Senior / Secondary"
      : "Primary";
}
export function GradeEnrollmentPage({
  grade,
  onBack,
}: {
  grade: string;
  onBack: () => void;
}) {
  const { currentAcademicYear } = useAcademicYear();
  const gradeType =
    grade === "Grade 7-9"
      ? "JUNIOR_SECONDARY"
      : grade === "Grade 10-13"
        ? "SENIOR_SECONDARY"
        : "PRIMARY";
  const schools = sortedRabaiSchools
    .filter((school) => school.institutionType === gradeType)
    .map((school) => {
      const year = rabaiSchoolYears.find(
        (record) =>
          record.schoolId === school.id &&
          record.academicYearId === currentAcademicYear.id,
      );
      const learners = year?.studentCount ?? 0;
      const boys = Math.round(learners * 0.51);
      return [school.displayName, boys, learners - boys] as const;
    });
  return (
    <div className="content">
      <div className="breadcrumbs profile-crumb">
        <button onClick={onBack}>Enrollment</button>
        <span>/</span>
        <span>{grade}</span>
      </div>
      <div className="grade-page-header">
        <div>
          <span className="eyebrow">Enrollment management</span>
          <h1>{grade} enrollment</h1>
          <p>
            School-level enrollment totals for {grade} -{" "}
            {currentAcademicYear.name}
          </p>
        </div>
        <div className="grade-page-actions">
          <ExportMenu
            title={`${grade} enrollment`}
            filename={`${grade.toLowerCase().replaceAll(" ", "-")}-enrollment`}
            headers={["School", "Boys", "Girls", "Total learners"]}
            rows={schools.map(([school, boys, girls]) => [
              school,
              boys,
              girls,
              Number(boys) + Number(girls),
            ])}
          />
        </div>
      </div>
      <section className="panel grade-enrollment-panel">
        <div className="panel-header grade-table-header">
          <div className="grade-table-title">
            <span className="grade-table-icon">
              <School />
            </span>
            <div>
              <span className="eyebrow">Selected grade stream</span>
              <h2>Schools by grade</h2>
              <p>
                {schools.length} schools reporting <i /> Boys, girls, and total
                learners
              </p>
            </div>
          </div>
          <div className="grade-table-summary">
            <span>
              <strong>{schools.length}</strong>
              <small>Schools</small>
            </span>
            <span>
              <strong>
                {schools.reduce((sum, row) => sum + Number(row[1]), 0)}
              </strong>
              <small>Boys</small>
            </span>
            <span>
              <strong>
                {schools.reduce((sum, row) => sum + Number(row[2]), 0)}
              </strong>
              <small>Girls</small>
            </span>
            <span className="grade-total-badge">
              <strong>
                {schools.reduce(
                  (sum, row) => sum + Number(row[1]) + Number(row[2]),
                  0,
                )}
              </strong>
              <small>Total</small>
            </span>
          </div>
        </div>
        <div className="grade-school-table">
          <div className="grade-school-head">
            <span>School</span>
            <span>Boys</span>
            <span>Girls</span>
            <span>Total learners</span>
          </div>
          {schools.map(([school, boys, girls]) => (
            <div className="grade-school-row" key={school}>
              <strong>{school}</strong>
              <span>{boys}</span>
              <span>{girls}</span>
              <b>{Number(boys) + Number(girls)}</b>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export function EnrollmentContent({
  onDetail,
  onGradeSelect,
}: {
  onDetail?: (item: string) => void;
  onGradeSelect?: (grade: string) => void;
}) {
  const { currentAcademicYear } = useAcademicYear();
  const [schoolType, setSchoolType] = useState("All schools");
  const [term, setTerm] = useState("Term 1");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const bands =
    enrollmentGradeBands[schoolType as keyof typeof enrollmentGradeBands];
  const enrollmentRows = sortedRabaiSchools.map((school) => {
    const year = rabaiSchoolYears.find(
      (record) =>
        record.schoolId === school.id &&
        record.academicYearId === currentAcademicYear.id,
    );

    return {
      school: school.displayName,
      type: getEnrollmentSchoolType(school.institutionType),
      total: year?.studentCount ?? 0,
      updated: currentAcademicYear.name,
    };
  });
  const filteredEnrollmentRows = enrollmentRows.filter((row) => {
    const matchesType = schoolType === "All schools" || row.type === schoolType;
    const normalizedQuery = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !normalizedQuery ||
      row.school.toLowerCase().includes(normalizedQuery) ||
      row.type.toLowerCase().includes(normalizedQuery);
    return matchesType && matchesSearch;
  });
  const pageCount = Math.max(
    1,
    Math.ceil(filteredEnrollmentRows.length / rowsPerPage),
  );
  const pageStart = (currentPage - 1) * rowsPerPage;
  const paginatedEnrollmentRows = filteredEnrollmentRows.slice(
    pageStart,
    pageStart + rowsPerPage,
  );
  const visibleStart = filteredEnrollmentRows.length === 0 ? 0 : pageStart + 1;
  const visibleEnd = Math.min(
    pageStart + rowsPerPage,
    filteredEnrollmentRows.length,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [schoolType, searchQuery, currentAcademicYear.id]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, pageCount));
  }, [pageCount]);

  const toggleGrade = (label: string) =>
    setSelectedGrades((current) =>
      current.includes(label)
        ? current.filter((grade) => grade !== label)
        : [...current, label],
    );
  const visibleGrades = selectedGrades.length
    ? bands.filter((band) => selectedGrades.includes(band.label))
    : bands;
  return (
    <div className="content">
      <PageHeader
        title="Enrollment"
        description="Capture and review learner enrollment by school, grade and term"
        eyebrow="Education Management / Enrollment"
      />
      <div className="enrollment-toolbar">
        <div>
          <span className="eyebrow">{currentAcademicYear.name}</span>
          <h2>Enrollment coverage</h2>
          <p>Every school reports learners across the correct grade band.</p>
        </div>
        <div className="enrollment-filters">
          <select
            value={schoolType}
            onChange={(e) => setSchoolType(e.target.value)}
          >
            <option>All schools</option>
            <option>Primary</option>
            <option>Junior</option>
            <option>Senior / Secondary</option>
          </select>
          <select value={term} onChange={(e) => setTerm(e.target.value)}>
            <option>Term 1</option>
            <option>Term 2</option>
            <option>Term 3</option>
          </select>
        </div>
      </div>
      <div className="grade-band-grid">
        {bands.map((band) => (
          <button
            type="button"
            className={`grade-band-card ${band.tone} ${selectedGrades.includes(band.label) ? "selected" : ""}`}
            key={band.label}
            onClick={() => onGradeSelect?.(band.label)}
            aria-pressed={selectedGrades.includes(band.label)}
          >
            <span className="grade-band-icon">
              <BookOpen />
            </span>
            <span className="grade-band-copy">
              <strong>{band.label}</strong>
              <span>{band.grades}</span>
            </span>
            <b>{band.count}</b>
            <span className="grade-select-indicator">
              {selectedGrades.includes(band.label) ? "Selected" : "Select"}
            </span>
          </button>
        ))}
      </div>
      <section className="panel enrollment-panel">
        <div className="panel-header">
          <div>
            <h2>School enrollment register</h2>
            <p>
              {term} - {currentAcademicYear.name} - {schoolType}
            </p>
          </div>
          <div className="enrollment-register-actions">
            <label className="enrollment-search">
              <Search aria-hidden="true" />
              {/* <span className="sr-only">Search school enrollment register</span> */}
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search schools"
              />
            </label>
            <ExportMenu
              title="School enrollment register"
              filename="school-enrollment-register"
              headers={[
                "School",
                "School type",
                "Coverage",
                "Learners",
                "Updated",
              ]}
              rows={filteredEnrollmentRows.map((row) => [
                row.school,
                row.type,
                row.type === "Primary"
                  ? "PP1-PP3 / Grade 1-6"
                  : row.type === "Junior"
                    ? "Grade 7-9"
                    : "Grade 10-13",
                row.total,
                row.updated,
              ])}
            />
          </div>
        </div>
        <div className="enrollment-table">
          <table className="enrollment-register-table">
            <thead>
              <tr>
                <th scope="col">School</th>
                <th scope="col">School type</th>
                <th scope="col">Coverage</th>
                <th scope="col" className="enrollment-total">
                  Learners
                </th>
                <th scope="col">Updated</th>
                <th scope="col">
                  <span className="sr-only">Open record</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredEnrollmentRows.length === 0 ? (
                <tr>
                  <td className="enrollment-empty-state" colSpan={6}>
                    No schools match &quot;{searchQuery}&quot;.
                  </td>
                </tr>
              ) : (
                paginatedEnrollmentRows.map((row) => (
                  <tr className="enrollment-row" key={row.school}>
                    <td>
                      <button
                        className="enrollment-school"
                        type="button"
                        onClick={() => onDetail?.(row.school)}
                      >
                        <span className="school-mini-icon">
                          <School />
                        </span>
                        <strong>{row.school}</strong>
                      </button>
                    </td>
                    <td className="enrollment-school-type">{row.type}</td>
                    <td>
                      <span className="coverage-pills">
                        {(row.type === "Primary"
                          ? bands.filter(
                              (band) =>
                                band.label === "PP1-PP3" ||
                                band.label === "Grade 1-6",
                            )
                          : row.type === "Junior"
                            ? bands.filter(
                                (band) => band.label === "Grade 7-9",
                              )
                            : bands.filter(
                                (band) => band.label === "Grade 10-13",
                              )
                        ).map((band) => (
                          <i key={band.label}>{band.label}</i>
                        ))}
                      </span>
                    </td>
                    <td>
                      <strong className="enrollment-total">
                        {row.total.toLocaleString()}
                      </strong>
                    </td>
                    <td className="enrollment-updated">{row.updated}</td>
                    <td>
                      <button
                        className="enrollment-row-action"
                        type="button"
                        onClick={() => onDetail?.(row.school)}
                        aria-label={`Open enrollment record for ${row.school}`}
                      >
                        <ChevronRight />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="pagination enrollment-register-pagination">
          <span>
            Showing {visibleStart}-{visibleEnd} of{" "}
            {filteredEnrollmentRows.length} schools
          </span>
          <div className="pages">
            <button
              type="button"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage === 1}
              aria-label="Previous enrollment page"
            >
              <ChevronLeft />
            </button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map(
              (page) => (
                <button
                  type="button"
                  className={currentPage === page ? "current" : ""}
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  aria-label={`Go to enrollment page ${page}`}
                >
                  {page}
                </button>
              ),
            )}
            <button
              type="button"
              onClick={() =>
                setCurrentPage((page) => Math.min(pageCount, page + 1))
              }
              disabled={currentPage === pageCount}
              aria-label="Next enrollment page"
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

export function EnrollmentGradeTable({
  school,
  term = "Term 1",
}: {
  school: string;
  term?: string;
}) {
  const schoolType = school.includes("Junior")
    ? "Junior"
    : school.includes("Senior") || school.includes("Secondary")
      ? "Senior / Secondary"
      : "Primary";
  const allRows = enrollmentGradeRows;
  const initialRows =
    schoolType === "Primary"
      ? allRows.slice(0, 9)
      : schoolType === "Junior"
        ? allRows.slice(9, 12)
        : allRows.slice(12);
  const [rows, setRows] = useState(initialRows);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ male: number; female: number }>({
    male: 0,
    female: 0,
  });
  const startEdit = (grade: string | number, male: number, female: number) => {
    setEditing(String(grade));
    setDraft({ male, female });
  };
  const cancelEdit = () => setEditing(null);
  const saveEdit = (grade: string | number) => {
    setRows(
      rows.map((row) =>
        row[0] === grade
          ? [row[0], draft.male, draft.female, draft.male + draft.female]
          : row,
      ),
    );
    setEditing(null);
  };
  return (
    <section className="panel enrollment-detail-panel">
      <div className="panel-header enrollment-detail-header">
        <div className="enrollment-detail-title">
          <span className="enrollment-detail-icon">
            <Users />
          </span>
          <div>
            <h2>Enrollment by grade</h2>
            <p>
              {school} · Academic year 2026 · {term}
            </p>
          </div>
        </div>
        <div className="enrollment-detail-summary">
          <span>
            <strong>
              {rows.reduce((sum, row) => sum + Number(row[3]), 0)}
            </strong>
            <small>Total learners</small>
          </span>
          <span>
            <strong>{rows.length}</strong>
            <small>Grade levels</small>
          </span>
        </div>
      </div>
      <div className="detail-enrollment-table">
        <div className="detail-enrollment-head">
          <span>Grade</span>
          <span>Male</span>
          <span>Female</span>
          <span>Total learners</span>
        </div>
        {rows.map(([grade, male, female, total]) => (
          <div
            className={`detail-enrollment-row ${editing === grade ? "is-editing" : ""}`}
            key={grade}
          >
            <strong>{grade}</strong>
            {editing === grade ? (
              <>
                <input
                  className="grade-number-input"
                  type="number"
                  min="0"
                  value={draft.male}
                  onChange={(e) =>
                    setDraft({ ...draft, male: Number(e.target.value) })
                  }
                  aria-label={`${grade} male learners`}
                />
                <input
                  className="grade-number-input"
                  type="number"
                  min="0"
                  value={draft.female}
                  onChange={(e) =>
                    setDraft({ ...draft, female: Number(e.target.value) })
                  }
                  aria-label={`${grade} female learners`}
                />
                <span className="grade-edit-actions">
                  <button
                    onClick={() => saveEdit(grade)}
                    aria-label={`Save ${grade}`}
                    className="grade-save"
                  >
                    <Check />
                  </button>
                  <button
                    onClick={cancelEdit}
                    aria-label={`Cancel ${grade}`}
                    className="grade-cancel"
                  >
                    <X />
                  </button>
                </span>
              </>
            ) : (
              <>
                <button
                  className="grade-number-button"
                  onClick={() => startEdit(grade, Number(male), Number(female))}
                >
                  {male}
                </button>
                <button
                  className="grade-number-button"
                  onClick={() => startEdit(grade, Number(male), Number(female))}
                >
                  {female}
                </button>
                <b>{total}</b>
              </>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

export default EnrollmentContent;
