"use client";

import { useEffect, useMemo, useState } from "react";
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
import { useFeatureData } from "../data/feature-data-context";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import PageHeader from "../ui/page-header";
import { ExportMenu } from "../ui/export-menu";
const enrollmentGradeBands = {
  Primary: [
    { label: "PP1-PP3", grades: "Early years", count: "3 grades", tone: "blue" },
    { label: "Grade 1-6", grades: "Primary cycle", count: "6 grades", tone: "indigo" },
  ],
  Junior: [
    { label: "Grade 7-9", grades: "Junior secondary", count: "3 grades", tone: "violet" },
  ],
  "Senior / Secondary": [
    { label: "Grade 10-12", grades: "Senior secondary", count: "3 grades", tone: "sky" },
  ],
  "All schools": [
    { label: "PP1-PP3", grades: "Early years", count: "3 grades", tone: "blue" },
    { label: "Grade 1-6", grades: "Primary cycle", count: "6 grades", tone: "indigo" },
    { label: "Grade 7-9", grades: "Junior secondary", count: "3 grades", tone: "violet" },
    { label: "Grade 10-12", grades: "Senior secondary", count: "3 grades", tone: "sky" },
  ],
} as const;

function getEnrollmentSchoolType(institutionType: string) {
  return institutionType === "JUNIOR_SECONDARY"
    ? "Junior"
    : institutionType === "SENIOR_SECONDARY"
      ? "Senior / Secondary"
      : "Primary";
}

function getEnrollmentGrades(schoolType: string) {
  if (schoolType === "Junior") {
    return ["Grade 7", "Grade 8", "Grade 9"];
  }
  if (schoolType === "Senior / Secondary") {
    return ["Grade 10", "Grade 11", "Grade 12"];
  }
  return [
    "PP1",
    "PP2",
    "PP3",
    "Grade 1",
    "Grade 2",
    "Grade 3",
    "Grade 4",
    "Grade 5",
    "Grade 6",
  ];
}

function getEnrollmentGradeBand(grade: string) {
  if (grade.startsWith("PP")) return "PP1-PP3";

  const gradeNumber = Number(grade.replace("Grade ", ""));
  if (gradeNumber <= 6) return "Grade 1-6";
  if (gradeNumber <= 9) return "Grade 7-9";
  return "Grade 10-12";
}

export function GradeEnrollmentPage({
  grade,
  onBack,
}: {
  grade: string;
  onBack: () => void;
}) {
  const { currentAcademicYear } = useAcademicYear();
  const { schools: schoolRecords, enrollmentRows, schoolYears } = useFeatureData();
  const gradeType =
    grade === "Grade 7-9"
      ? "JUNIOR_SECONDARY"
      : grade === "Grade 10-12"
        ? "SENIOR_SECONDARY"
        : "PRIMARY";
  const schools = [...schoolRecords]
    .filter((school) => school.institutionType === gradeType)
    .map((school) => {
      const rows = enrollmentRows.filter(
        (record) =>
          record.schoolId === school.id &&
          record.academicYearId === currentAcademicYear.id &&
          record.gradeBand === grade,
      );
      return [
        school.displayName,
        rows.reduce((total, row) => total + row.male, 0),
        rows.reduce((total, row) => total + row.female, 0),
      ] as const;
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
  const { schools, schoolYears, enrollmentRows: gradeRows, terms } = useFeatureData();
  const [schoolType, setSchoolType] = useState("All schools");
  const [termId, setTermId] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGrades, setSelectedGrades] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 10;
  const bands =
    enrollmentGradeBands[schoolType as keyof typeof enrollmentGradeBands];
  const currentTerms = terms.filter(
    (termRecord) => termRecord.academicYearId === currentAcademicYear.id,
  );
  const selectedTerm =
    currentTerms.find((termRecord) => termRecord.id === termId) ??
    currentTerms[0] ??
    null;
  const enrollmentRows = [...schools]
    .sort((a, b) => a.displayName.localeCompare(b.displayName))
    .map((school) => {
    const year = schoolYears.find(
      (record) =>
        record.schoolId === school.id &&
        record.academicYearId === currentAcademicYear.id,
    );

    return {
      school: school.displayName,
      type: getEnrollmentSchoolType(school.institutionType),
      total: selectedTerm
        ? gradeRows
            .filter(
          (row) =>
            row.schoolId === school.id &&
            row.academicYearId === currentAcademicYear.id &&
            row.termId === selectedTerm.id,
            )
            .reduce((sum, row) => sum + row.total, 0)
        : year?.studentCount ?? 0,
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
  }, [schoolType, searchQuery, currentAcademicYear.id, selectedTerm?.id]);

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
          <select
            value={selectedTerm?.id ?? ""}
            onChange={(event) => setTermId(event.target.value)}
          >
            {currentTerms.length === 0 && <option value="">All terms</option>}
            {currentTerms.map((termRecord) => (
              <option key={termRecord.id} value={termRecord.id}>
                {termRecord.name}
              </option>
            ))}
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
              {selectedTerm?.name ?? "All terms"} - {currentAcademicYear.name} - {schoolType}
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
                    : "Grade 10-12",
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
                                (band) => band.label === "Grade 10-12",
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
  termId,
  onSaveGrade,
}: {
  school: string;
  term?: string;
  termId?: string | null;
  onSaveGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
}) {
  const { currentAcademicYear } = useAcademicYear();
  const { schools: schoolRecords, enrollmentRows } = useFeatureData();
  const schoolRecord = schoolRecords.find(
    (record) => record.displayName === school,
  );
  const schoolType = getEnrollmentSchoolType(
    schoolRecord?.institutionType ?? "",
  );
  const initialRows = useMemo(() => {
    const savedRows = new Map(
      enrollmentRows
        .filter(
          (row) =>
            row.schoolId === schoolRecord?.id &&
            row.academicYearId === currentAcademicYear.id &&
            (!termId || row.termId === termId),
        )
        .map((row) => [row.grade, row] as const),
    );

    return getEnrollmentGrades(schoolType).map((grade) => {
      const savedRow = savedRows.get(grade);
      return [
        grade,
        savedRow?.male ?? 0,
        savedRow?.female ?? 0,
        savedRow?.total ?? 0,
      ] as const;
    });
  }, [
    currentAcademicYear.id,
    enrollmentRows,
    schoolRecord?.id,
    schoolType,
    termId,
  ]);
  const [rows, setRows] = useState(initialRows);
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ male: number; female: number }>({
    male: 0,
    female: 0,
  });
  const [savingGrade, setSavingGrade] = useState<string | null>(null);
  const [saveError, setSaveError] = useState("");
  const startEdit = (grade: string | number, male: number, female: number) => {
    setEditing(String(grade));
    setDraft({ male, female });
    setSaveError("");
  };
  const cancelEdit = () => setEditing(null);
  const saveEdit = async (grade: string | number) => {
    const gradeName = String(grade);
    if (
      !Number.isSafeInteger(draft.male) ||
      !Number.isSafeInteger(draft.female) ||
      draft.male < 0 ||
      draft.female < 0
    ) {
      setSaveError("Boys and girls counts must be non-negative whole numbers.");
      return;
    }
    if (!onSaveGrade || !schoolRecord || !termId) {
      setSaveError("Enrollment cannot be saved because its school, term, or database handler is unavailable.");
      return;
    }

    const gradeBand = getEnrollmentGradeBand(gradeName);
    setSavingGrade(gradeName);
    setSaveError("");
    try {
      await onSaveGrade({
        schoolId: schoolRecord.id,
        academicYearId: currentAcademicYear.id,
        termId,
        grade: gradeName,
        gradeBand,
        male: draft.male,
        female: draft.female,
      });
      setRows((currentRows) =>
        currentRows.map((row) =>
          row[0] === gradeName
            ? [row[0], draft.male, draft.female, draft.male + draft.female]
            : row,
        ),
      );
      setEditing(null);
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "Enrollment could not be saved.",
      );
    } finally {
      setSavingGrade(null);
    }
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
              {school} · {currentAcademicYear.name} · {term}
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
      {saveError && <p role="alert">{saveError}</p>}
      <div className="detail-enrollment-table">
        <div className="detail-enrollment-head">
          <span>Grade</span>
          <span>Boys</span>
          <span>Girls</span>
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
                  aria-label={`${grade} boys`}
                />
                <input
                  className="grade-number-input"
                  type="number"
                  min="0"
                  value={draft.female}
                  onChange={(e) =>
                    setDraft({ ...draft, female: Number(e.target.value) })
                  }
                  aria-label={`${grade} girls`}
                />
                <span className="grade-edit-actions">
                  <button
                    onClick={() => void saveEdit(grade)}
                    aria-label={`Save ${grade}`}
                    className="grade-save"
                    disabled={savingGrade === grade}
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
