"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@scsms/ui/components/button";
import {
  BookOpen,
  Building2,
  FileBarChart2,
  Gauge,
  MapPinned,
  Pencil,
  Plus,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { useFeatureData } from "../data/feature-data-context";
import type { WardDetailRecord } from "../data/feature-data-context";
import { ConfirmDeleteDialog } from "../ui/confirm-delete-dialog";
import StatusBadge from "../ui/status-badge";
import { DetailTabs } from "../pages/detail-tabs";
import { ExportMenu } from "../ui/export-menu";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

export function RecordDetail({
  active,
  item,
  onBack,
  wardId: persistedWardId,
  wardDetail,
  wardCode: persistedWardCode,
  onDeleteWard,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
}: {
  active: string;
  item: string;
  onBack: () => void;
  wardId?: string;
  wardDetail?: WardDetailRecord;
  wardCode?: string;
  onDeleteWard?: () => Promise<void>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const { currentAcademicYear } = useAcademicYear();
  const {
    schools,
    schoolYears,
    staff: staffRecords,
    wards,
    subCounties,
    reportTemplates,
    performanceRecords,
  } = useFeatureData();
  const schoolDetail = schools.find(
    (school) =>
      school.displayName === item ||
      school.officialName === item ||
      school.schoolCode === item,
  );
  const latestPerformance = performanceRecords
    .filter((record) => record.schoolId === schoolDetail?.id)
    .sort((a, b) => b.year.localeCompare(a.year))[0];
  const enrollmentDetail = schoolYears.find(
    (record) =>
      record.schoolId === schoolDetail?.id &&
      record.academicYearId === currentAcademicYear.id,
  );
  const defaultPerformanceLevel = item.toLowerCase().includes("junior")
    ? "Junior Secondary"
    : item.toLowerCase().includes("secondary") ||
        item.toLowerCase().includes("senior")
      ? "Senior School"
      : "Primary";
  const [performanceForm, setPerformanceForm] = useState({
    assessment: "KPSEA",
    academicYear: "",
    level: defaultPerformanceLevel,
    candidates: "",
    meanScore: "",
    subjects: "",
    bestSubject: "",
    exceedingCount: "",
    meetingCount: "",
    approachingCount: "",
    belowCount: "",
    notes: "",
  });
  const reportDetail =
    active === "Reports"
      ? reportTemplates.find(
          (report) => report.key === item || report.title === item,
        )
      : null;
  const staffDetail =
    active === "Staff"
      ? staffRecords.find((record) => record.name === item)
      : null;
  const staffId = staffDetail?.id ?? "Not provided";
  const staffTscNo = staffDetail?.tscNo || "Not provided";
  const staffEmail = staffDetail?.email || "Not provided";
  const wardSchools =
    active === "Ward" ? schools.filter((school) => school.ward === item) : [];
  const wardSchoolIds = new Set(wardSchools.map((school) => school.id));
  const wardYearRows = schoolYears.filter(
    (record) =>
      record.academicYearId === currentAcademicYear.id &&
      wardSchoolIds.has(record.schoolId),
  );
  const wardLearners = wardYearRows.reduce(
    (sum, record) => sum + record.studentCount,
    0,
  );
  const wardStaff = wardYearRows.reduce(
    (sum, record) => sum + record.teacherCount,
    0,
  );
  const wardRecord =
    active === "Ward"
      ? wards.find((ward) => ward.id === persistedWardId) ??
        wards.find(
          (ward) =>
            ward.name === item || ward.wardCode === persistedWardCode,
        ) ??
        null
      : null;
  const wardSubCounty = wardRecord
    ? subCounties.find((subCounty) => subCounty.id === wardRecord.subCountyId)
    : null;
  const wardInfo = wardDetail
    ? wardDetail
    : wardRecord
    ? {
        wardCode: wardRecord.wardCode,
        county: wardSubCounty?.county ?? wardRecord.county,
        countyCode: wardSubCounty?.countyCode ?? wardRecord.countyCode,
        subCounty: wardSubCounty?.subCounty ?? wardRecord.subCounty,
        subCountyCode:
          wardSubCounty?.subCountyCode ?? wardRecord.subCountyCode,
        constituency:
          wardSubCounty?.constituency ?? wardRecord.constituency,
        constituencyCode:
          wardSubCounty?.constituencyCode ?? wardRecord.constituencyCode,
      }
    : null;
  const resolvedWardId =
    persistedWardId ?? wardDetail?.id ?? wardRecord?.id;
  const wardCode =
    persistedWardCode ??
    wardInfo?.wardCode ??
    item
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  const Icon =
    active === "Staff"
      ? UserCog
      : active === "Enrollment"
        ? Users
        : active === "Infrastructure"
          ? Building2
          : active === "School Performance"
            ? Gauge
            : active === "Reports"
              ? FileBarChart2
              : active === "Ward"
                ? MapPinned
                : BookOpen;

  const fields =
    active === "Staff"
      ? [
          ["Staff ID", staffId],
          ["Full name", staffDetail?.name ?? item],
          ["Designation", staffDetail?.role ?? "Teacher"],
          ["Assigned school", staffDetail?.assignedSchool ?? "Not assigned"],
          ["Employment type", staffDetail?.employmentType ?? "Not recorded"],
          ["Employer", staffDetail?.employer ?? "Not recorded"],
          ["TSC No.", staffTscNo],
          ["Email address", staffEmail],
          ["Phone number", staffDetail?.phone ?? "Not provided"],
          ["Date joined", staffDetail?.dateJoined || "Not provided"],
          ["Status", staffDetail?.status ?? "Not recorded"],
        ]
      : active === "Enrollment"
        ? [
            ["School", item],
            [
              "School type",
              schoolDetail?.institutionType.replaceAll("_", " ") ?? "Not recorded",
            ],
            [
              "Coverage",
              "Recorded enrollment grades",
            ],
            ["Learners", String(enrollmentDetail?.studentCount ?? 0)],
            ["Boys", String(enrollmentDetail?.maleCount ?? 0)],
            ["Girls", String(enrollmentDetail?.femaleCount ?? 0)],
            [
              "Updated",
              enrollmentDetail ? currentAcademicYear.name : "Not recorded",
            ],
          ]
        : active === "Infrastructure"
          ? [
              ["School", item],
              ["Infrastructure", "Current project records"],
            ]
          : active === "School Contacts"
            ? [
                ["School", item],
                ["Contact", "See contact records"],
              ]
            : active === "School Performance"
              ? [
                  ["School", item],
                  ["Level", schoolDetail?.institutionType.replaceAll("_", " ") ?? "Not recorded"],
                  ["KNEC Code", schoolDetail?.knecCode ?? "Not provided"],
                  ["Exam Candidature", String(latestPerformance?.candidates ?? 0)],
                  ["Mean Score", latestPerformance?.averageScore?.toString() ?? "Not recorded"],
                  ["Assessment", latestPerformance?.assessmentName ?? "Not recorded"],
                  ["Year", latestPerformance?.year ?? "Not recorded"],
                ]
              : active === "Ward"
                ? [
                    ["Ward", item],
                    ["Ward code", wardCode],
                    ["County", wardInfo?.county ?? "Not provided"],
                    ["County code", wardInfo?.countyCode ?? "Not provided"],
                    ["Sub-County", wardInfo?.subCounty ?? "Not provided"],
                    ["Sub-County code", wardInfo?.subCountyCode ?? "Not provided"],
                    ["Constituency", wardInfo?.constituency ?? "Not provided"],
                    ["Constituency code", wardInfo?.constituencyCode ?? "Not provided"],
                    ["Academic year", currentAcademicYear.name],
                    [
                      "Status",
                      wardDetail || wardRecord ? "Registered" : "Not recorded",
                    ],
                    ["Schools", wardSchools.length.toLocaleString()],
                    ["Learners", wardLearners.toLocaleString()],
                    ["Staff", wardStaff.toLocaleString()],
                    [
                      "Public schools",
                      wardSchools
                        .filter((school) => school.ownershipType === "PUBLIC")
                        .length.toLocaleString(),
                    ],
                    [
                      "Private schools",
                      wardSchools
                        .filter((school) => school.ownershipType === "PRIVATE")
                        .length.toLocaleString(),
                    ],
                    [
                      "Primary schools",
                      wardSchools
                        .filter(
                          (school) => school.institutionType === "PRIMARY",
                        )
                        .length.toLocaleString(),
                    ],
                    [
                      "Junior secondary schools",
                      wardSchools
                        .filter(
                          (school) =>
                            school.institutionType === "JUNIOR_SECONDARY",
                        )
                        .length.toLocaleString(),
                    ],
                    [
                      "Senior schools",
                      wardSchools
                        .filter(
                          (school) =>
                            school.institutionType === "SENIOR_SECONDARY",
                        )
                        .length.toLocaleString(),
                    ],
                    ["Notes", "Ward-level Rabai school coverage record"],
                  ]
                : [
                    ["Report code", reportDetail?.code ?? "Not provided"],
                    ["Report type", reportDetail?.title ?? item],
                    ["Category", reportDetail?.category ?? "Operational"],
                    [
                      "Reporting period",
                      currentAcademicYear.name,
                    ],
                    [
                      "Records included",
                      String(reportDetail?.recordsIncluded ?? 0),
                    ],
                    [
                      "Last generated",
                      reportDetail?.lastGenerated ?? "Not generated",
                    ],
                    [
                      "Owner",
                      "Not assigned",
                    ],
                    ["Status", reportDetail?.status ?? "Not configured"],
                  ];

  const submitPerformanceDetails = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowPerformanceModal(false);
  };
  const candidatesCount = Number(performanceForm.candidates) || 0;
  const calculatePerformancePercentage = (value: string) => {
    const count = Number(value) || 0;
    if (!candidatesCount) return "0%";
    return `${Math.round((count / candidatesCount) * 100)}%`;
  };
  const confirmDelete = async () => {
    setDeleteError("");
    if (!onDeleteWard) {
      onBack();
      return;
    }
    try {
      await onDeleteWard();
      onBack();
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error.message : "Unable to delete the ward.",
      );
    }
  };

  return (
    <div className="content">
      {showDeleteModal && (
        <ConfirmDeleteDialog
          item={item}
          confirmCode={active === "Ward" ? wardCode : item}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={confirmDelete}
          error={deleteError}
        />
      )}
      {showPerformanceModal && (
        <div className="overlay" onClick={() => setShowPerformanceModal(false)}>
          <div
            className="form-dialog performance-form-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-head">
              <div>
                <span className="eyebrow">School Performance</span>
                <h2>Add performance details</h2>
                <p>Capture assessment results and summary details.</p>
              </div>
              <button
                className="icon-button"
                type="button"
                onClick={() => setShowPerformanceModal(false)}
              >
                <X />
              </button>
            </div>
            <form onSubmit={submitPerformanceDetails}>
              <div className="form-section">
                <h3>Performance details</h3>
                <div className="form-grid">
                  <label>
                    Assessment
                    <select
                      value={performanceForm.assessment}
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          assessment: event.target.value,
                        }))
                      }
                    >
                      <option>KPSEA</option>
                      <option>KJSEA</option>
                      <option>KCSE</option>
                    </select>
                  </label>
                  <label>
                    Academic year
                    <input
                      value={performanceForm.academicYear}
                      placeholder={currentAcademicYear.name}
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          academicYear: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Level
                    <select
                      value={performanceForm.level}
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          level: event.target.value,
                        }))
                      }
                    >
                      <option>Primary</option>
                      <option>Junior Secondary</option>
                      <option>Senior School</option>
                    </select>
                  </label>
                  <label>
                    Candidates
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.candidates}
                      placeholder="50"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          candidates: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Mean score
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={performanceForm.meanScore}
                      placeholder="9.30"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          meanScore: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Subjects
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.subjects}
                      placeholder="12"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          subjects: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Best subject
                    <input
                      value={performanceForm.bestSubject}
                      placeholder="Mathematics"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          bestSubject: event.target.value,
                        }))
                      }
                    />
                  </label>
                  <label>
                    Exceeding expectation
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.exceedingCount}
                      placeholder="12"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          exceedingCount: event.target.value,
                        }))
                      }
                    />
                    <span className="calculated-percentage">
                      {calculatePerformancePercentage(
                        performanceForm.exceedingCount,
                      )}
                    </span>
                  </label>
                  <label>
                    Meeting expectation
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.meetingCount}
                      placeholder="24"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          meetingCount: event.target.value,
                        }))
                      }
                    />
                    <span className="calculated-percentage">
                      {calculatePerformancePercentage(
                        performanceForm.meetingCount,
                      )}
                    </span>
                  </label>
                  <label>
                    Approaching expectation
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.approachingCount}
                      placeholder="10"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          approachingCount: event.target.value,
                        }))
                      }
                    />
                    <span className="calculated-percentage">
                      {calculatePerformancePercentage(
                        performanceForm.approachingCount,
                      )}
                    </span>
                  </label>
                  <label>
                    Below expectation
                    <input
                      type="number"
                      min="0"
                      value={performanceForm.belowCount}
                      placeholder="4"
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          belowCount: event.target.value,
                        }))
                      }
                    />
                    <span className="calculated-percentage">
                      {calculatePerformancePercentage(
                        performanceForm.belowCount,
                      )}
                    </span>
                  </label>
                  <label className="form-grid-full">
                    Notes
                    <textarea
                      value={performanceForm.notes}
                      onChange={(event) =>
                        setPerformanceForm((current) => ({
                          ...current,
                          notes: event.target.value,
                        }))
                      }
                      placeholder="Optional assessment notes"
                    />
                  </label>
                </div>
              </div>
              <div className="dialog-footer">
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setShowPerformanceModal(false)}
                >
                  Cancel
                </button>
                <Button className="modal-primary-button" type="submit">
                  Save performance details
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="breadcrumbs profile-crumb">
        <button onClick={onBack}>{active}</button>
        <span>/</span>
        <span>View details</span>
      </div>
      <div className="profile-head">
        <div className="profile-title">
          <div className="profile-school-icon">
            <Icon />
          </div>
          <div>
            <div className="profile-code">
              {active === "Staff"
                  ? staffId
                : active === "Enrollment"
                    ? enrollmentDetail?.id ?? "Not provided"
                  : active === "School Performance"
                    ? schoolDetail?.knecCode ?? "Not provided"
                    : active === "Ward"
                      ? wardCode
                      : active === "Reports"
                        ? (reportDetail?.code ?? "REPORT")
                        : "SC-SMS RECORD"}
            </div>
            <h1>{item}</h1>
            <div className="profile-sub">
              <span>{active}</span>
              <i />
              <StatusBadge status="Active" />
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <ExportMenu
            title={`${active} - ${item}`}
            filename={`${active.toLowerCase().replaceAll(" ", "-")}-detail`}
            headers={["Field", "Value"]}
            rows={fields.map(([label, value]) => [label, value])}
          />
          {active === "School Performance" && (
            <Button
              className="edit-school-button"
              onClick={() => setShowPerformanceModal(true)}
            >
              <Plus data-icon="inline-start" />
              Add performance details
            </Button>
          )}
          {active !== "Enrollment" && (
            <Button
              className="edit-record-button"
              onClick={() =>
                window.dispatchEvent(
                  new CustomEvent("scsms-edit-record", {
                    detail: {
                      active,
                      item,
                      wardCode: active === "Ward" ? wardCode : undefined,
                      wardId: active === "Ward" ? resolvedWardId : undefined,
                    },
                  }),
                )
              }
            >
              <Pencil data-icon="inline-start" />
              Edit {active === "Reports" ? "Report" : "Record"}
            </Button>
          )}
          {(active === "Ward" || active === "Staff") && (
            <button
              className="danger-button"
              onClick={() => setShowDeleteModal(true)}
            >
              <Trash2 />
              Delete
            </button>
          )}
        </div>
      </div>
      <DetailTabs
        active={active}
        item={item}
        onTabChange={setSelectedTab}
        onSaveEnrollmentGrade={onSaveEnrollmentGrade}
        onSaveInfrastructureFacility={onSaveInfrastructureFacility}
      />
      {active !== "School Performance" && (
        <div
          className={`profile-grid ${selectedTab === "Overview" ? "" : "enrollment-overview-hidden"}`}
        >
          <section className="panel detail-panel">
            <div className="panel-header">
              <div>
                <h2>Record information</h2>
                <p>Official {active.toLowerCase()} details</p>
              </div>
            </div>
            <dl className="detail-list">
              {fields.map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      )}
    </div>
  );
}
