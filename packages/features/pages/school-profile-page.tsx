"use client";

import { useEffect, useState } from "react";
import { Button } from "@scsms/ui/components/button";
import { useAcademicYear } from "../academic-years/academic-year-context";
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Info,
  Pencil,
  Plus,
  Save,
  School,
  Trash2,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { ConfirmDeleteDialog } from "../ui/confirm-delete-dialog";
import StatusBadge from "../ui/status-badge";
import SchoolContactsContent from "../pages/contacts-page";
import InfrastructureContent from "../pages/infrastructure-page";
import { EnrollmentGradeTable } from "../pages/enrollment-page";
import { StaffContent } from "../pages/staff-page";
import { rabaiSchools, rabaiSchoolYears } from "../../../database/seeders/rabai-schools";
import { schoolHistoryActivities } from "../../../database/seeders/profile";
import { ExportMenu } from "../ui/export-menu";
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

const displayValue = (value: string | number | null | undefined) =>
  value !== null && value !== undefined && String(value).trim()
    ? String(value)
    : "Not provided";

type SubjectCombinationRecord = {
  code: string;
  combination: string;
  pathway: string;
  track: string;
};

const pathwayOptions = ["Social Science", "STEM", "Art & Sport Science"];
const trackOptions = [
  "Sports",
  "Pure Science",
  "Humanities and Business Studies",
  "Applied Science",
  "Technical Studies",
  "More",
];

const seniorSubjectCombinations: SubjectCombinationRecord[] = [
  {
    code: "SSC-101",
    combination: "History, CRE, Business Studies",
    pathway: "Social Science",
    track: "Humanities and Business Studies",
  },
  {
    code: "SSC-204",
    combination: "Physics, Chemistry, Advanced Mathematics",
    pathway: "STEM",
    track: "Pure Science",
  },
  {
    code: "SSC-218",
    combination: "Computer Studies, Physics, Design Technology",
    pathway: "STEM",
    track: "Applied Science",
  },
  {
    code: "SSC-305",
    combination: "Sports Science, Biology, Physical Education",
    pathway: "Art & Sport Science",
    track: "Sports",
  },
  {
    code: "SSC-411",
    combination: "Agriculture, Building Construction, Electricity",
    pathway: "STEM",
    track: "Technical Studies",
  },
  {
    code: "SSC-506",
    combination: "Geography, History, Literature",
    pathway: "Social Science",
    track: "Humanities and Business Studies",
  },
  {
    code: "SSC-612",
    combination: "Biology, Chemistry, Agriculture",
    pathway: "STEM",
    track: "Applied Science",
  },
  {
    code: "SSC-707",
    combination: "Music, Theatre, Physical Education",
    pathway: "Art & Sport Science",
    track: "Sports",
  },
  {
    code: "SSC-809",
    combination: "Business Studies, Mathematics, Geography",
    pathway: "Social Science",
    track: "Humanities and Business Studies",
  },
  {
    code: "SSC-914",
    combination: "Electricity, Computer Studies, Mathematics",
    pathway: "STEM",
    track: "Technical Studies",
  },
  {
    code: "SSC-102",
    combination: "Fine Art, Music, Literature",
    pathway: "Art & Sport Science",
    track: "More",
  },
  {
    code: "SSC-215",
    combination: "Physics, Geography, Computer Studies",
    pathway: "STEM",
    track: "Pure Science",
  },
];

function SubjectCombinationsContent({ schoolName }: { schoolName: string }) {
  const pageSize = 10;
  const [combinations, setCombinations] = useState(seniorSubjectCombinations);
  const [page, setPage] = useState(1);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCode, setEditingCode] = useState<string | null>(null);
  const [draft, setDraft] = useState<SubjectCombinationRecord | null>(null);
  const [newCombination, setNewCombination] =
    useState<SubjectCombinationRecord>({
      code: "",
      combination: "",
      pathway: pathwayOptions[0],
      track: trackOptions[0],
    });
  const totalPages = Math.ceil(combinations.length / pageSize);
  const shouldPaginate = combinations.length > pageSize;
  const currentPage = Math.min(page, Math.max(1, totalPages));
  const visibleCombinations = combinations.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const updateDraft = (
    field: keyof SubjectCombinationRecord,
    value: string,
  ) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };
  const startEdit = (row: SubjectCombinationRecord) => {
    setEditingCode(row.code);
    setDraft({ ...row });
  };
  const cancelEdit = () => {
    setEditingCode(null);
    setDraft(null);
  };
  const saveEdit = () => {
    if (!editingCode || !draft) return;
    setCombinations((current) =>
      current.map((row) => (row.code === editingCode ? draft : row)),
    );
    cancelEdit();
  };
  const deleteCombination = (code: string) => {
    setCombinations((current) => {
      const nextCombinations = current.filter((row) => row.code !== code);
      const nextTotalPages = Math.max(
        1,
        Math.ceil(nextCombinations.length / pageSize),
      );

      setPage((currentPageValue) => Math.min(currentPageValue, nextTotalPages));

      return nextCombinations;
    });

    if (editingCode === code) {
      cancelEdit();
    }
  };
  const addCombination = () => {
    if (!newCombination.code.trim() || !newCombination.combination.trim()) {
      return;
    }

    const nextCombination = {
      ...newCombination,
      code: newCombination.code.trim(),
      combination: newCombination.combination.trim(),
    };
    const nextCombinations = [...combinations, nextCombination];

    setCombinations(nextCombinations);
    setNewCombination({
      code: "",
      combination: "",
      pathway: pathwayOptions[0],
      track: trackOptions[0],
    });
    setShowAddModal(false);
    setPage(Math.ceil(nextCombinations.length / pageSize));
  };

  return (
    <section className="panel table-panel subject-combinations-panel">
      {showAddModal && (
        <div className="overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="form-dialog"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="dialog-head">
              <div>
                <span className="eyebrow">Subject combinations</span>
                <h2>Add subject combination</h2>
                <p>Create a senior school pathway and track combination.</p>
              </div>
              <button
                className="icon-button"
                onClick={() => setShowAddModal(false)}
                aria-label="Close add subject combination form"
              >
                <X />
              </button>
            </div>
            <form
              onSubmit={(event) => {
                event.preventDefault();
                addCombination();
              }}
            >
              <div className="form-section">
                <h3>Combination details</h3>
                <div className="form-grid">
                  <label>
                    Subject code
                    <input
                      value={newCombination.code}
                      onChange={(event) =>
                        setNewCombination((current) => ({
                          ...current,
                          code: event.target.value,
                        }))
                      }
                      placeholder="SSC-000"
                    />
                  </label>
                  <label>
                    Subject combination
                    <input
                      value={newCombination.combination}
                      onChange={(event) =>
                        setNewCombination((current) => ({
                          ...current,
                          combination: event.target.value,
                        }))
                      }
                      placeholder="Subject 1, Subject 2, Subject 3"
                    />
                  </label>
                  <label>
                    Pathway
                    <select
                      value={newCombination.pathway}
                      onChange={(event) =>
                        setNewCombination((current) => ({
                          ...current,
                          pathway: event.target.value,
                        }))
                      }
                    >
                      {pathwayOptions.map((pathway) => (
                        <option key={pathway}>{pathway}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Track
                    <select
                      value={newCombination.track}
                      onChange={(event) =>
                        setNewCombination((current) => ({
                          ...current,
                          track: event.target.value,
                        }))
                      }
                    >
                      {trackOptions.map((track) => (
                        <option key={track}>{track}</option>
                      ))}
                    </select>
                  </label>
                </div>
              </div>
              <div className="dialog-footer">
                <button
                  className="outline-button"
                  type="button"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <Button className="modal-primary-button" type="submit">
                  Add combination
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
      <div className="panel-header">
        <div>
          <h2>Subject combinations</h2>
          <p>{schoolName} - Senior school pathway and track options</p>
        </div>
        <Button
          className="edit-school-button"
          onClick={() => setShowAddModal(true)}
        >
          <Plus data-icon="inline-start" />
          Add combination
        </Button>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Subject code</th>
              <th>Subject combination</th>
              <th>Pathway</th>
              <th>Track</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {visibleCombinations.map((row) => {
              const isEditing = editingCode === row.code;
              const activeDraft = isEditing ? draft : null;

              return (
                <tr key={row.code}>
                  <td>
                    {activeDraft ? (
                      <input
                        className="subject-inline-input"
                        value={activeDraft.code}
                        onChange={(event) =>
                          updateDraft("code", event.target.value)
                        }
                      />
                    ) : (
                      row.code
                    )}
                  </td>
                  <td>
                    {activeDraft ? (
                      <input
                        className="subject-inline-input"
                        value={activeDraft.combination}
                        onChange={(event) =>
                          updateDraft("combination", event.target.value)
                        }
                      />
                    ) : (
                      row.combination
                    )}
                  </td>
                  <td>
                    {activeDraft ? (
                      <select
                        className="subject-inline-input"
                        value={activeDraft.pathway}
                        onChange={(event) =>
                          updateDraft("pathway", event.target.value)
                        }
                      >
                        {pathwayOptions.map((pathway) => (
                          <option key={pathway}>{pathway}</option>
                        ))}
                      </select>
                    ) : (
                      row.pathway
                    )}
                  </td>
                  <td>
                    {activeDraft ? (
                      <select
                        className="subject-inline-input"
                        value={activeDraft.track}
                        onChange={(event) =>
                          updateDraft("track", event.target.value)
                        }
                      >
                        {trackOptions.map((track) => (
                          <option key={track}>{track}</option>
                        ))}
                      </select>
                    ) : (
                      row.track
                    )}
                  </td>
                  <td>
                    <span className="subject-row-actions">
                      {activeDraft ? (
                        <>
                          <button
                            type="button"
                            aria-label={`Save ${row.code}`}
                            onClick={saveEdit}
                          >
                            <Save />
                          </button>
                          <button
                            type="button"
                            aria-label={`Cancel ${row.code}`}
                            onClick={cancelEdit}
                          >
                            <X />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            aria-label={`Edit ${row.code}`}
                            onClick={() => startEdit(row)}
                          >
                            <Pencil />
                          </button>
                          <button
                            type="button"
                            aria-label={`Delete ${row.code}`}
                            className="subject-delete-button"
                            onClick={() => deleteCombination(row.code)}
                          >
                            <Trash2 />
                          </button>
                        </>
                      )}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shouldPaginate && (
        <div className="pagination subject-combinations-pagination">
          <span>
            Showing {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, combinations.length)} of{" "}
            {combinations.length} combinations
          </span>
          <div className="page-buttons">
            <button
              aria-label="Previous subject combinations"
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
              aria-label="Next subject combinations"
              disabled={currentPage === totalPages}
              onClick={() =>
                setPage((value) => Math.min(totalPages, value + 1))
              }
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export function SchoolHistoryContent({ schoolName }: { schoolName: string }) {
  const activityIcons = { Pencil, Building2, UserCog, Users };
  const activities = schoolHistoryActivities;
  return (
    <section className="panel school-history-panel">
      <div className="panel-header">
        <div>
          <h2>School activity history</h2>
          <p>{schoolName} - Activity recorded for this school only</p>
        </div>
      </div>
      <div className="school-history-list">
        {activities.map((activity) => (
          <div className="school-history-row" key={activity.title}>
            <span className="school-history-icon">
              {(() => {
                const Icon = activityIcons[activity.icon];
                return <Icon />;
              })()}
            </span>
            <div>
              <strong>{activity.title}</strong>
              <span>{activity.detail}</span>
            </div>
            <time>{activity.time}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

export function SchoolProfile({
  schoolId,
  onBack,
}: {
  schoolId: string;
  onBack: () => void;
}) {
  const [tab, setTab] = useState("Overview");
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [term, setTerm] = useState("Term 1");
  const { currentAcademicYear } = useAcademicYear();
  const school =
    rabaiSchools.find((record) => record.id === schoolId) ?? rabaiSchools[0];
  const isSeniorSchool = school.institutionType === "SENIOR_SECONDARY";
  const yearRecord = rabaiSchoolYears.find(
    (record) =>
      record.schoolId === school.id &&
      record.academicYearId === currentAcademicYear.id,
  );
  const totalGenderLearners = yearRecord?.studentCount ?? 0;
  const maleLearners = Math.round(totalGenderLearners * 0.51);
  const femaleLearners = totalGenderLearners - maleLearners;
  const maleShare = totalGenderLearners
    ? Math.round((maleLearners / totalGenderLearners) * 100)
    : 0;
  const genderDistribution = [
    { label: "Male", value: maleLearners, tone: "male" },
    { label: "Female", value: femaleLearners, tone: "female" },
  ];
  const schoolClassification = getSchoolClassification(school);
  const registrationStatus = getSchoolRegistrationStatus(school);
  const schoolLevel = getSchoolLevel(school);
  const schoolOwnership = getSchoolOwnership(school);
  const titleDeed = getSchoolTitleDeed();
  const completenessFields = [
    school.schoolCode,
    school.uicCode,
    registrationStatus,
    schoolLevel,
    school.officialName,
    school.displayName,
    schoolClassification,
    schoolOwnership,
    school.genderType,
    school.boardingType,
    school.ward,
    school.location,
    school.address,
    school.phone,
    school.email,
    school.latitude,
    school.longitude,
    titleDeed,
  ];
  const completeness = Math.round(
    (completenessFields.filter(
      (value) => value !== null && value !== undefined && String(value).trim(),
    ).length /
      completenessFields.length) *
      100,
  );
  const coordinates =
    school.latitude !== null && school.longitude !== null
      ? `${school.latitude}, ${school.longitude}`
      : "Not provided";
  useEffect(() => {
    if (!isSeniorSchool && tab === "Subject") {
      setTab("Overview");
    }
  }, [isSeniorSchool, tab]);
  const schoolExportRows = [
    ["School code", displayValue(school.schoolCode)],
    ["UIC code", displayValue(school.uicCode)],
    ["Official name", school.officialName],
    ["Display name", school.displayName],
    ["Institution type", formatSchoolClassification(schoolClassification)],
    ["Registration status", formatSchoolRegistrationStatus(registrationStatus)],
    ["Level", formatSchoolLevel(schoolLevel)],
    ["Ownership", formatSchoolOwnership(schoolOwnership)],
    ["Gender", formatSchoolGender(school.genderType)],
    ["Boarding", formatSchoolBoarding(school.boardingType)],
    ["Title deed", formatSchoolTitleDeed(titleDeed)],
    ["SNE", displayValue(school.sne.replaceAll("_", " "))],
    [
      "Data confidence",
      displayValue(school.dataConfidence.replaceAll("_", " ")),
    ],
    ["County", school.county],
    ["Sub-County", school.subCounty],
    ["Ward", displayValue(school.ward)],
    ["Location", displayValue(school.location)],
    ["Address", displayValue(school.address)],
    ["Coordinates", coordinates],
    ["Phone", displayValue(school.phone)],
    ["Email", displayValue(school.email)],
    ["Students", totalGenderLearners],
    ["Teaching staff", yearRecord?.teacherCount ?? 0],
    ["Classrooms", yearRecord?.classCount ?? 0],
    ["Status", school.isActive ? "Active" : "Inactive"],
  ];
  const openSchoolEdit = () =>
    window.dispatchEvent(
      new CustomEvent("scsms-edit-record", {
        detail: {
          active: "Schools",
          item: school.displayName,
        },
      }),
    );

  return (
    <div className={`content ${tab === "Staff" ? "school-profile-staff" : ""}`}>
      {showDeleteModal && (
        <ConfirmDeleteDialog
          item={school.displayName}
          onCancel={() => setShowDeleteModal(false)}
          onConfirm={onBack}
        />
      )}
      <div className="breadcrumbs profile-crumb">
        <button onClick={onBack}>Schools</button>
        <span>/</span>
        <span>{school.displayName}</span>
      </div>
      <div className="profile-head">
        <div className="profile-title">
          <div className="profile-school-icon">
            <School />
          </div>
          <div>
            <div className="profile-code">
              {displayValue(school.schoolCode)}
            </div>
            <h1>{school.displayName}</h1>
            <div className="profile-sub">
              <span>{formatSchoolClassification(schoolClassification)}</span>
              <i /> <span>{formatSchoolLevel(schoolLevel)}</span>
              <i /> <span>{formatSchoolOwnership(schoolOwnership)}</span>
              <i />{" "}
              <StatusBadge status={school.isActive ? "Active" : "Inactive"} />
            </div>
          </div>
        </div>
        <div className="profile-actions">
          <ExportMenu
            title={`${school.displayName} profile`}
            filename={`${school.displayName.toLowerCase().replaceAll(" ", "-")}-profile`}
            headers={["Field", "Value"]}
            rows={schoolExportRows}
          />
          <Button className="edit-school-button" onClick={openSchoolEdit}>
            <Pencil data-icon="inline-start" />
            Edit School
          </Button>
          <button
            className="danger-button"
            onClick={() => setShowDeleteModal(true)}
          >
            <Trash2 />
            Delete
          </button>
        </div>
      </div>
      <div className="profile-tabs">
        {[
          "Overview",
          "Enrollment",
          "Staff",
          "Infrastructure",
          ...(isSeniorSchool ? ["Subject"] : []),
          "Contacts",
          "History",
        ].map((x) => (
          <button
            className={tab === x ? "active" : ""}
            onClick={() => setTab(x)}
            key={x}
          >
            {x}
            {x === "Contacts" && <span>3</span>}
          </button>
        ))}
      </div>
      {tab === "Contacts" ? (
        <SchoolContactsContent school={school.displayName} />
      ) : tab === "History" ? (
        <SchoolHistoryContent schoolName={school.displayName} />
      ) : tab === "Staff" ? (
        <StaffContent variant="school-profile" />
      ) : tab === "Infrastructure" ? (
        <InfrastructureContent detail school={school.displayName} />
      ) : tab === "Subject" && isSeniorSchool ? (
        <SubjectCombinationsContent schoolName={school.displayName} />
      ) : tab === "Enrollment" ? (
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
                  <small>{currentAcademicYear.name}</small>
                </span>
                <b>{term === termName ? "Current" : "Select"}</b>
              </button>
            ))}
          </div>
          <EnrollmentGradeTable school={school.displayName} term={term} />
        </div>
      ) : tab === "Overview" ? (
        <div className="profile-grid">
          <section className="panel detail-panel">
            <div className="panel-header">
              <div>
                <h2>School information</h2>
                <p>Official registry details</p>
              </div>
              <button className="icon-button" onClick={openSchoolEdit}>
                <Pencil />
              </button>
            </div>
            <dl className="detail-list">
              <div>
                <dt>School code</dt>
                <dd>{displayValue(school.schoolCode)}</dd>
              </div>
              <div>
                <dt>UIC code</dt>
                <dd>{displayValue(school.uicCode)}</dd>
              </div>
              <div>
                <dt>KNEC code</dt>
                <dd>Not provided</dd>
              </div>
              <div>
                <dt>TSC code</dt>
                <dd>Not provided</dd>
              </div>
              <div>
                <dt>Registration number</dt>
                <dd>Not provided</dd>
              </div>
              <div>
                <dt>Official name</dt>
                <dd>{school.officialName}</dd>
              </div>
              <div>
                <dt>Display name</dt>
                <dd>{school.displayName}</dd>
              </div>
              <div>
                <dt>Institution type</dt>
                <dd>{formatSchoolClassification(schoolClassification)}</dd>
              </div>
              <div>
                <dt>Registration status</dt>
                <dd>{formatSchoolRegistrationStatus(registrationStatus)}</dd>
              </div>
              <div>
                <dt>Level</dt>
                <dd>{formatSchoolLevel(schoolLevel)}</dd>
              </div>
              <div>
                <dt>Ownership</dt>
                <dd>
                  <span className="type-label">
                    <span
                      className={`type-dot ${schoolOwnership.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}
                    />
                    {formatSchoolOwnership(schoolOwnership)}
                  </span>
                </dd>
              </div>
              <div>
                <dt>Gender</dt>
                <dd>{formatSchoolGender(school.genderType)}</dd>
              </div>
              <div>
                <dt>Boarding</dt>
                <dd>{formatSchoolBoarding(school.boardingType)}</dd>
              </div>
              <div>
                <dt>Title deed</dt>
                <dd>{formatSchoolTitleDeed(titleDeed)}</dd>
              </div>
              <div>
                <dt>SNE</dt>
                <dd>{displayValue(school.sne.replaceAll("_", " "))}</dd>
              </div>
              <div>
                <dt>Data confidence</dt>
                <dd>
                  {displayValue(school.dataConfidence.replaceAll("_", " "))}
                </dd>
              </div>
            </dl>
          </section>
          <section className="panel detail-panel">
            <div className="panel-header">
              <div>
                <h2>Location</h2>
                <p>Administrative location details</p>
              </div>
              <button className="icon-button" onClick={openSchoolEdit}>
                <Pencil />
              </button>
            </div>
            <dl className="detail-list">
              <div>
                <dt>County</dt>
                <dd>{school.county}</dd>
              </div>
              <div>
                <dt>Sub-County</dt>
                <dd>{school.subCounty}</dd>
              </div>
              <div>
                <dt>Ward</dt>
                <dd>{displayValue(school.ward)}</dd>
              </div>
              <div>
                <dt>Location</dt>
                <dd>{displayValue(school.location)}</dd>
              </div>
              <div>
                <dt>Address</dt>
                <dd>{displayValue(school.address)}</dd>
              </div>
              <div>
                <dt>Coordinates</dt>
                <dd>{coordinates}</dd>
              </div>
              <div>
                <dt>Phone</dt>
                <dd>{displayValue(school.phone)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{displayValue(school.email)}</dd>
              </div>
            </dl>
          </section>
          <section className="panel stats-detail">
            <div className="panel-header">
              <div>
                <h2>Current statistics</h2>
                <p>Latest reported figures</p>
              </div>
              <span className="as-of">{currentAcademicYear.name}</span>
            </div>
            <div className="detail-stat-grid">
              <div>
                <Users />
                <strong>{totalGenderLearners.toLocaleString()}</strong>
                <span>Students</span>
              </div>
              <div>
                <UserCog />
                <strong>
                  {(yearRecord?.teacherCount ?? 0).toLocaleString()}
                </strong>
                <span>Teaching staff</span>
              </div>
              <div>
                <Users />
                <strong>{displayValue(school.sourceInstitutionType)}</strong>
                <span>Source type</span>
              </div>
              <div>
                <Building2 />
                <strong>
                  {(yearRecord?.classCount ?? 0).toLocaleString()}
                </strong>
                <span>Classrooms</span>
              </div>
            </div>
          </section>
          <div className="profile-insight-row">
            <section className="panel gender-detail">
              <div className="panel-header">
                <div>
                  <h2>Gender distribution</h2>
                  <p>Current learner count by gender</p>
                </div>
                <span className="quality-value">{totalGenderLearners}</span>
              </div>
              <div className="gender-chart-wrap">
                <div
                  className="gender-donut"
                  style={{
                    background: `conic-gradient(#2563eb 0 ${maleShare}%, #38bdf8 ${maleShare}% 100%)`,
                  }}
                  aria-label={`Gender distribution: ${maleShare}% male and ${100 - maleShare}% female`}
                >
                  <div>
                    <strong>{maleShare}%</strong>
                    <span>male</span>
                  </div>
                </div>
                <div className="gender-legend">
                  {genderDistribution.map((item) => (
                    <span key={item.label}>
                      <i className={`gender-${item.tone}`} />
                      {item.label}
                      <b>{item.value}</b>
                    </span>
                  ))}
                </div>
              </div>
            </section>
            <section className="panel completeness-detail">
              <div className="panel-header">
                <div>
                  <h2>Data completeness</h2>
                  <p>Profile information quality</p>
                </div>
                <span className="quality-value">{completeness}%</span>
              </div>
              <div className="progress">
                <span style={{ width: `${completeness}%` }} />
              </div>
              <div className="quality-breakdown">
                <span>
                  <Check /> Basic information
                </span>
                <span>
                  <Check /> Location
                </span>
                <span>
                  <Check /> Enrollment
                </span>
                <span className="missing">
                  <Info /> Infrastructure (1 missing)
                </span>
              </div>
              <button className="text-button">
                Review missing data <ChevronRight />
              </button>
            </section>
          </div>
        </div>
      ) : (
        <div className="panel tab-placeholder">
          <div className="empty-state">
            <ClipboardCheck />
            <strong>{tab} records</strong>
            <span>
              This section is ready for {tab.toLowerCase()} data management.
            </span>
            <Button>
              <Plus data-icon="inline-start" />
              Add {tab.slice(0, -1)}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default SchoolProfile;
