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
import { ConfirmDeleteDialog } from "../ui/confirm-delete-dialog";
import StatusBadge from "../ui/status-badge";
import { DetailTabs } from "../pages/detail-tabs";
import {
  getRabaiWardInfo,
  getRabaiSchoolsByWard,
  rabaiSchoolYears,
} from "../data/fixtures/rabai-schools";
import { getReportDetail } from "../data/fixtures/reports";
import { staffRecords } from "../data/fixtures/staff";
import { ExportMenu } from "../ui/export-menu";

export function RecordDetail({
  active,
  item,
  onBack,
}: {
  active: string;
  item: string;
  onBack: () => void;
}) {
  const [selectedTab, setSelectedTab] = useState("Overview");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPerformanceModal, setShowPerformanceModal] = useState(false);
  const { currentAcademicYear } = useAcademicYear();
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
  const reportDetail = active === "Reports" ? getReportDetail(item) : null;
  const staffDetail =
    active === "Staff"
      ? staffRecords.find((record) => record.name === item)
      : null;
  const staffIndex =
    active === "Staff"
      ? staffRecords.findIndex((record) => record.name === item)
      : -1;
  const staffId =
    staffIndex >= 0
      ? `STF-${String(staffIndex + 12).padStart(3, "0")}`
      : "STF-012";
  const staffTscNo =
    staffIndex >= 0
      ? `TSC-${String(staffIndex + 12).padStart(4, "0")}`
      : "Not provided";
  const staffEmail = staffDetail
    ? `${staffDetail.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ".")
        .replace(/^\.+|\.+$/g, "")}@school.example`
    : "staff@school.example";
  const wardSchools = active === "Ward" ? getRabaiSchoolsByWard(item) : [];
  const wardSchoolIds = new Set(wardSchools.map((school) => school.id));
  const wardYearRows = rabaiSchoolYears.filter(
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
  const wardInfo = active === "Ward" ? getRabaiWardInfo(item) : null;
  const wardCode =
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
          ["Assigned school", "Mwangaza Primary School"],
          ["Employment type", "Permanent"],
          ["Employer", "Government (TSC)"],
          ["TSC No.", staffTscNo],
          ["Email address", staffEmail],
          ["Phone number", staffDetail?.phone ?? "+254 700 000 000"],
          ["Date joined", "15 January 2023"],
          ["Status", "Active"],
        ]
      : active === "Enrollment"
        ? [
            ["School", item],
            [
              "School type",
              item.includes("Junior")
                ? "Junior"
                : item.includes("Senior")
                  ? "Senior / Secondary"
                  : "Primary",
            ],
            [
              "Coverage",
              item.includes("Junior")
                ? "Grade 7-9"
                : item.includes("Senior")
                  ? "Grade 10-13"
                  : "PP1-PP3 / Grade 1-6",
            ],
            [
              "Learners",
              item.includes("Mwangaza")
                ? "642"
                : item.includes("Bahari")
                  ? "518"
                  : item.includes("Kijani")
                    ? "836"
                    : "412",
            ],
            [
              "Boys",
              item.includes("Mwangaza")
                ? "326"
                : item.includes("Bahari")
                  ? "264"
                  : item.includes("Kijani")
                    ? "421"
                    : "205",
            ],
            [
              "Girls",
              item.includes("Mwangaza")
                ? "316"
                : item.includes("Bahari")
                  ? "254"
                  : item.includes("Kijani")
                    ? "415"
                    : "207",
            ],
            [
              "Updated",
              item.includes("Mwangaza") || item.includes("Bahari")
                ? "Today"
                : item.includes("Kijani")
                  ? "Yesterday"
                  : "2 days ago",
            ],
          ]
        : active === "Infrastructure"
          ? [
              ["School", item],
              ["Classrooms", "18 total"],
              ["Good condition", "14"],
              ["Needs repair", "3"],
              ["Electricity", "Yes"],
              ["Water", "Yes"],
              ["Internet", "Available"],
            ]
          : active === "School Contacts"
            ? [
                ["School", item],
                ["Contact name", "John Kamau"],
                ["Role", "Head Teacher"],
                ["Phone", "+254 700 000 012"],
                ["Email", "contact@school.example"],
                ["Status", "Active"],
              ]
            : active === "School Performance"
              ? [
                  ["School", item],
                  ["Level", "Primary"],
                  ["KNEC Code", "04122123"],
                  ["Exam Canditature", "50"],
                  ["Mean Score", "9.30"],
                  ["Subjects", "12"],
                  ["Year", "2026"],
                ]
              : active === "Ward"
                ? [
                    ["Ward", item],
                    ["Ward code", wardCode],
                    ["County", wardInfo?.county ?? "Kilifi"],
                    ["County code", wardInfo?.countyCode ?? "003"],
                    ["Sub-County", wardInfo?.subCounty ?? "Rabai"],
                    ["Sub-County code", wardInfo?.subCountyCode ?? "014"],
                    ["Constituency", wardInfo?.constituency ?? "Rabai"],
                    ["Constituency code", wardInfo?.constituencyCode ?? "014"],
                    ["Academic year", currentAcademicYear.name],
                    ["Status", "Active"],
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
                    ["Report code", reportDetail?.code ?? "RPT-000"],
                    ["Report type", reportDetail?.title ?? item],
                    ["Category", reportDetail?.category ?? "Operational"],
                    [
                      "Reporting period",
                      reportDetail?.reportingPeriod ?? "Academic Year 2026",
                    ],
                    [
                      "Records included",
                      reportDetail?.recordsIncluded ?? "128 schools",
                    ],
                    [
                      "Last generated",
                      reportDetail?.lastGenerated ?? "18 September 2026",
                    ],
                    [
                      "Owner",
                      reportDetail?.owner ?? "Sub-County Education Office",
                    ],
                    ["Status", reportDetail?.status ?? "Ready for export"],
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

  return (
    <div className="content">
      {showDeleteModal && (
        <ConfirmDeleteDialog
          item={item}
          confirmCode={active === "Ward" ? wardCode : item}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={onBack}
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
                ? "STF-012"
                : active === "Enrollment"
                  ? "ENR-2026-004"
                  : active === "School Performance"
                    ? "04122123"
                    : active === "Ward"
                      ? wardCode
                      : active === "Reports"
                        ? (reportDetail?.code ?? "RPT-000")
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
                    detail: { active, item },
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
      <DetailTabs active={active} item={item} onTabChange={setSelectedTab} />
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
