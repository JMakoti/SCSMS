"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  Check,
  ChevronDown,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { useFeatureData } from "../data/feature-data-context";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { infrastructureProjectSchema } from "../schemas/infrastructure-project-schema";
import type { InfrastructureProjectFormValues } from "../types/forms";
import type {
  InfrastructureFacilityRow,
  InfrastructureProjectRecord,
} from "../types/fixtures";
import StatusBadge from "../ui/status-badge";
import { ExportMenu } from "../ui/export-menu";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import { formatInfrastructureFacilityStatus } from "../schools/infrastructure-display";

type InfrastructureProjectActions = {
  onCreateProject?: (
    input: InfrastructureProjectFormValues,
  ) => Promise<string | void>;
  onUpdateProject?: (
    projectId: string,
    input: InfrastructureProjectFormValues,
  ) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
};

type InfrastructureContentProps = InfrastructureProjectActions & {
  detail?: boolean;
  school?: string;
  onSaveFacility?: (input: InfrastructureFacilitySaveInput) => Promise<void>;
};

export function AddInfrastructureDialog({
  onClose,
  selectedSchool,
  onSaveProject,
}: {
  onClose: () => void;
  selectedSchool?: string;
  onSaveProject?: InfrastructureProjectActions["onCreateProject"];
}) {
  const { schools, terms } = useFeatureData();
  const { currentAcademicYear } = useAcademicYear();
  const targetYear =
    Number(currentAcademicYear.name.match(/\d{4}/)?.[0]) ||
    new Date().getFullYear();
  const currentTerm = terms.find(
    (term) => term.academicYearId === currentAcademicYear.id,
  );
  const registrySchools = [...schools].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  const resolvedSchool = selectedSchool ?? registrySchools[0]?.displayName ?? "";
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { register, handleSubmit } = useForm<InfrastructureProjectFormValues>({
    resolver: zodResolver(infrastructureProjectSchema),
    defaultValues: {
      selectedSchool: resolvedSchool,
      category: "Classrooms",
      status: "Active",
      term: currentTerm?.name ?? "",
      targetYear,
    },
  });
  const saveProject = async (values: InfrastructureProjectFormValues) => {
    if (!onSaveProject) {
      setSaveError("Infrastructure project saving is not configured.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await onSaveProject(values);
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error
          ? error.message
          : "The infrastructure project could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Infrastructure management</span>
            <h2>Add infrastructure project</h2>
            <p>Record a school facility, utility, or infrastructure project.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close add infrastructure form"
          >
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>Infrastructure project saved</h3>
            <p>The infrastructure project has been saved.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(saveProject)}>
            {saveError && <p role="alert">{saveError}</p>}
            <div className="form-section">
              <h3>Project details</h3>
              <div className="form-grid">
                <label>
                  Project name
                  <input
                    {...register("projectName")}
                    autoFocus
                    placeholder="e.g. New classroom block"
                  />
                </label>
                <label>
                  Selected school
                  <input type="hidden" {...register("selectedSchool")} />
                  <div className="selected-school-field">
                    <strong>{selectedSchool}</strong>
                    <span>
                      Infrastructure records will be added to this school
                    </span>
                  </div>
                </label>
                <label>
                  Project name
                  <input {...register("contractor")} placeholder="Contractor" />
                </label>
                <label>
                  Project category
                  <select {...register("category")}>
                    <option>Classrooms</option>
                    <option>Administration block</option>
                    <option>Staff rooms</option>
                    <option>Library</option>
                    <option>Laboratory</option>
                    <option>Computer laboratory</option>
                    <option>Workshop</option>
                    <option>Dining hall</option>
                    <option>Kitchen</option>
                    <option>Dormitories</option>
                    <option>Toilets and sanitation</option>
                    <option>Water supply</option>
                    <option>Electricity and power</option>
                    <option>ICT infrastructure</option>
                    <option>Sports and recreation</option>
                    <option>Playground</option>
                    <option>School fencing and security</option>
                    <option>Roads and access</option>
                    <option>Drainage</option>
                    <option>Waste management</option>
                    <option>Environmental projects</option>
                    <option>Special needs facilities</option>
                    <option>Accessibility facilities</option>
                    <option>Furniture and fittings</option>
                    <option>School transport facilities</option>
                    <option>Staff housing</option>
                    <option>Maintenance and renovation</option>
                    <option>New construction</option>
                    <option>Expansion and extension</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Infrastructure Condition
                  <select {...register("infrastructureCondition")}>
                    <option>Good</option>
                    <option>Fair</option>
                    <option>Poor</option>
                    <option>Need Replacement</option>
                  </select>
                </label>
                <label>
                  Project status
                  <select {...register("status")}>
                    <option>Active</option>
                    <option>Ongoing</option>
                    <option>Completed</option>
                    <option>Delayed</option>
                  </select>
                </label>
                <label>
                  Term
                  <select {...register("term")}>
                    <option value="">Select a term</option>
                    {terms
                      .filter((term) => term.academicYearId === currentAcademicYear.id)
                      .map((term) => (
                        <option key={term.id} value={term.name}>
                          {term.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Budget
                  <input {...register("budget")} placeholder="KES 0" />
                </label>
                <label>
                  Target year
                  <input
                    {...register("targetYear", { valueAsNumber: true })}
                    type="number"
                    min={targetYear}
                    placeholder={String(targetYear)}
                  />
                </label>
                <label>
                  Year Started
                  <input
                    {...register("dateStarted")}
                    type="date"
                  />
                </label>
                <label>
                  Completed Date
                  <input
                    {...register("dateCompleted")}
                    type="date"
                  />
                </label>
                <label className="form-grid-full">
                  Description
                  <textarea
                    {...register("description")}
                    placeholder="Describe the project scope and expected outcome"
                  />
                </label>
              </div>
            </div>
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button
                className="modal-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save project"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function InfrastructureContent({
  detail = false,
  school,
  onSaveFacility,
  onCreateProject,
  onUpdateProject,
  onDeleteProject,
}: InfrastructureContentProps) {
  const {
    schools,
    terms,
    academicYears,
    infrastructureFacilities,
    infrastructureProjects,
  } =
    useFeatureData();
  const { currentAcademicYear } = useAcademicYear();
  const registrySchools = [...schools].sort((a, b) =>
    a.displayName.localeCompare(b.displayName),
  );
  const selectedSchool = school ?? registrySchools[0]?.displayName ?? "";
  const selectedSchoolId = registrySchools.find(
    (record) => record.displayName === selectedSchool,
  )?.id;
  const selectedSchoolFacilities = useMemo(
    () =>
      infrastructureFacilities.filter(
        (facility) =>
          facility.schoolId === selectedSchoolId &&
          facility.academicYearId === currentAcademicYear.id,
      ),
    [currentAcademicYear.id, infrastructureFacilities, selectedSchoolId],
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [facilityRows, setFacilityRows] = useState<InfrastructureFacilityRow[]>(
    selectedSchoolFacilities,
  );
  const [editingFacility, setEditingFacility] = useState<string | null>(null);
  const [savingFacility, setSavingFacility] = useState(false);
  const [facilitySaveError, setFacilitySaveError] = useState("");
  const [facilityDraft, setFacilityDraft] =
    useState<InfrastructureFacilityRow | null>(null);
  const [projects, setProjects] = useState<InfrastructureProjectRecord[]>(
    infrastructureProjects,
  );
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] =
    useState<InfrastructureProjectRecord | null>(null);
  const [projectSaveError, setProjectSaveError] = useState("");
  const [savingProject, setSavingProject] = useState(false);
  useEffect(() => {
    setFacilityRows(selectedSchoolFacilities);
  }, [selectedSchoolFacilities]);
  useEffect(() => {
    setProjects(infrastructureProjects);
  }, [infrastructureProjects]);
  const visibleProjects = detail
    ? projects.filter((project) => project.school === school)
    : projects;
  const startFacilityEdit = (row: InfrastructureFacilityRow) => {
    setEditingFacility(row.facility);
    setFacilityDraft({ ...row });
  };
  const updateFacilityDraft = (
    field: keyof InfrastructureFacilityRow,
    value: string,
  ) => {
    setFacilityDraft((current) => {
      if (!current) return current;
      return {
        ...current,
        [field]:
          field === "available" || field === "good" || field === "needsRepair"
            ? Number(value)
            : value,
      };
    });
  };
  const saveFacilityEdit = async () => {
    if (!facilityDraft || !editingFacility) return;
    if (
      !selectedSchoolId ||
      !onSaveFacility ||
      !Number.isSafeInteger(facilityDraft.available) ||
      !Number.isSafeInteger(facilityDraft.good) ||
      !Number.isSafeInteger(facilityDraft.needsRepair) ||
      facilityDraft.available < 0 ||
      facilityDraft.good < 0 ||
      facilityDraft.needsRepair < 0
    ) {
      setFacilitySaveError(
        "Facility changes cannot be saved. Check the school and non-negative whole-number counts.",
      );
      return;
    }

    const originalRow = selectedSchoolFacilities.find(
      (row) => row.facility === editingFacility,
    );
    if (!originalRow) {
      setFacilitySaveError(
        "This facility could not be found in the selected school. Refresh the data and try again.",
      );
      return;
    }

    setSavingFacility(true);
    setFacilitySaveError("");
    try {
      await onSaveFacility({
        schoolId: selectedSchoolId,
        academicYearId: currentAcademicYear.id,
        previousFacility: originalRow.facility,
        facility: facilityDraft.facility.trim(),
        available: facilityDraft.available,
        good: facilityDraft.good,
        needsRepair: facilityDraft.needsRepair,
        status: formatInfrastructureFacilityStatus(facilityDraft.status) as
          InfrastructureFacilitySaveInput["status"],
      });
      setFacilityRows((current) =>
        current.map((row) =>
          row.facility === editingFacility ? facilityDraft : row,
        ),
      );
      setEditingFacility(null);
      setFacilityDraft(null);
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
    } catch (error) {
      setFacilitySaveError(
        error instanceof Error
          ? error.message
          : "The facility could not be saved.",
      );
    } finally {
      setSavingFacility(false);
    }
  };
  const cancelFacilityEdit = () => {
    setEditingFacility(null);
    setFacilityDraft(null);
  };
  const deleteFacility = (facility: string) => {
    setFacilityRows((current) =>
      current.filter((row) => row.facility !== facility),
    );
    if (editingFacility === facility) cancelFacilityEdit();
  };
  const startProjectEdit = (project: InfrastructureProjectRecord) => {
    setEditingProject(project.name);
    setProjectDraft({ ...project });
  };
  const updateProjectDraft = (
    field: keyof InfrastructureProjectRecord,
    value: string,
  ) => {
    setProjectDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
  };
  const saveProjectEdit = async () => {
    if (!projectDraft || !editingProject) return;
    const currentProject = projects.find(
      (project) => (project.id ?? project.name) === editingProject,
    );
    if (!currentProject?.id || !onUpdateProject) {
      setProjectSaveError(
        "This project cannot be updated because its database record or save handler is unavailable.",
      );
      return;
    }
    const targetYear = Number(projectDraft.year);
    if (!Number.isInteger(targetYear)) {
      setProjectSaveError("Enter a valid target year before saving.");
      return;
    }

    setSavingProject(true);
    setProjectSaveError("");
    try {
      await onUpdateProject(currentProject.id, {
        projectName: projectDraft.name,
        selectedSchool: projectDraft.school,
        category: projectDraft.category ?? "Other",
        status: projectDraft.status,
        term: projectDraft.term === "Not recorded" ? "" : projectDraft.term,
        budget:
          projectDraft.budget === "Not recorded" ? "" : projectDraft.budget,
        targetYear,
        description: projectDraft.detail,
        contractor: projectDraft.contractor ?? "",
        infrastructureCondition: projectDraft.condition ?? "",
        dateStarted: projectDraft.dateStarted ?? "",
        dateCompleted: projectDraft.dateCompleted ?? "",
      });
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      setProjects((current) =>
        current.map((project) =>
          project.id === currentProject.id ? projectDraft : project,
        ),
      );
      setEditingProject(null);
      setProjectDraft(null);
    } catch (error) {
      setProjectSaveError(
        error instanceof Error
          ? error.message
          : "The infrastructure project could not be saved.",
      );
    } finally {
      setSavingProject(false);
    }
  };
  const cancelProjectEdit = () => {
    setEditingProject(null);
    setProjectDraft(null);
  };
  const deleteProject = async (projectKey: string) => {
    const project = projects.find(
      (record) => (record.id ?? record.name) === projectKey,
    );
    if (!project?.id || !onDeleteProject) {
      setProjectSaveError(
        "This project cannot be deleted because its database record or delete handler is unavailable.",
      );
      return;
    }
    setProjectSaveError("");
    try {
      await onDeleteProject(project.id);
      setProjects((current) =>
        current.filter((record) => record.id !== project.id),
      );
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      if (editingProject === projectKey) cancelProjectEdit();
    } catch (error) {
      setProjectSaveError(
        error instanceof Error
          ? error.message
          : "The infrastructure project could not be deleted.",
      );
    }
  };

  return (
    <div
      className={`infrastructure-page ${detail ? "infrastructure-detail-page" : "infrastructure-standalone-page"}`}
    >
      {showAddModal && (
        <AddInfrastructureDialog
          selectedSchool={school}
          onClose={() => setShowAddModal(false)}
          onSaveProject={onCreateProject}
        />
      )}
      <section className="panel infrastructure-panel">
        {facilitySaveError && <p role="alert">{facilitySaveError}</p>}
        <div className="panel-header">
          <div>
            <h2>School infrastructure</h2>
            <p>{school} - Current facilities and condition</p>
          </div>
          <div className="infrastructure-actions">
            <button
              className="edit-school-button"
              onClick={() => setShowAddModal(true)}
            >
              <Plus />
              Add Infrastructure
            </button>
            <ExportMenu
              title={`${school} infrastructure facilities`}
              filename="infrastructure-facilities"
              headers={[
                "Facility",
                "Available",
                "Good condition",
                "Needs repair",
                "Status",
              ]}
              rows={facilityRows.map((row) => [
                row.facility,
                row.available,
                row.good,
                row.needsRepair,
                row.status,
              ])}
            />
          </div>
        </div>
        <div className="infrastructure-table">
          <div className="infrastructure-table-head">
            <span>Facility</span>
            <span>Available</span>
            <span>Good condition</span>
            <span>Needs repair</span>
            <span>Status</span>
            <span>Actions</span>
          </div>
          {facilityRows.map((row) => {
            const isEditing = editingFacility === row.facility;
            const draft = isEditing ? facilityDraft : null;

            return (
              <div
                className={`infrastructure-table-row ${isEditing ? "is-editing" : ""}`}
                key={row.facility}
              >
                <strong>
                  {isEditing && draft ? (
                    <input
                      className="infrastructure-inline-input"
                      value={draft.facility}
                      onChange={(event) =>
                        updateFacilityDraft("facility", event.target.value)
                      }
                    />
                  ) : (
                    row.facility
                  )}
                </strong>
                {isEditing && draft ? (
                  <>
                    <input
                      className="infrastructure-inline-input numeric"
                      type="number"
                      min="0"
                      value={draft.available}
                      onChange={(event) =>
                        updateFacilityDraft("available", event.target.value)
                      }
                    />
                    <input
                      className="infrastructure-inline-input numeric"
                      type="number"
                      min="0"
                      value={draft.good}
                      onChange={(event) =>
                        updateFacilityDraft("good", event.target.value)
                      }
                    />
                    <input
                      className="infrastructure-inline-input numeric"
                      type="number"
                      min="0"
                      value={draft.needsRepair}
                      onChange={(event) =>
                        updateFacilityDraft("needsRepair", event.target.value)
                      }
                    />
                    <select
                      className="infrastructure-inline-input"
                      value={draft.status}
                      onChange={(event) =>
                        updateFacilityDraft("status", event.target.value)
                      }
                    >
                      <option>Pending</option>
                      <option>Active</option>
                      <option>Completed</option>
                      <option>Needs repair</option>
                      <option>Unavailable</option>
                    </select>
                  </>
                ) : (
                  <>
                    <span>{row.available}</span>
                    <span>{row.good}</span>
                    <span>{row.needsRepair}</span>
                    <StatusBadge status={row.status} />
                  </>
                )}
                <span className="infrastructure-row-actions">
                  {isEditing ? (
                    <>
                      <button type="button" onClick={cancelFacilityEdit}>
                        <X />
                      </button>
                      <button
                        type="button"
                        onClick={() => void saveFacilityEdit()}
                        disabled={savingFacility}
                      >
                        <Save />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        aria-label={`Edit ${row.facility}`}
                        onClick={() => startFacilityEdit(row)}
                      >
                        <Pencil />
                      </button>
                      <button
                        type="button"
                        aria-label={`Delete ${row.facility}`}
                        className="infrastructure-delete-button"
                        onClick={() => deleteFacility(row.facility)}
                      >
                        <Trash2 />
                      </button>
                    </>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </section>
      <section className="panel infrastructure-projects-panel">
        {projectSaveError && <p role="alert">{projectSaveError}</p>}
        <div className="panel-header">
          <div>
            <h2>Infrastructure projects</h2>
            <p>
              {visibleProjects.length} projects recorded
              {detail ? ` for ${school}` : " across schools"}
            </p>
          </div>
          <ExportMenu
            title="Infrastructure projects"
            filename="infrastructure-projects"
            headers={[
              "Project",
              "School",
              "Year",
              "Term",
              "Status",
              "Budget",
              "Detail",
            ]}
            rows={visibleProjects.map((project) => [
              project.name,
              project.school,
              project.year,
              project.term,
              project.status,
              project.budget,
              project.detail,
            ])}
          />
        </div>
        <div className="infrastructure-project-list">
          {visibleProjects.length === 0 && (
            <div className="infrastructure-empty-projects">
              <Building2 />
              <strong>No projects recorded</strong>
              <span>{school} has no infrastructure projects yet.</span>
            </div>
          )}
          {visibleProjects.map((project) => {
            const projectKey = project.id ?? project.name;
            const isEditing = editingProject === projectKey;
            const draft = isEditing ? projectDraft : null;

            return (
              <details
                className="infrastructure-project"
                key={projectKey}
                open={isEditing || undefined}
              >
                <summary>
                  <span className="project-marker">
                    <Building2 />
                  </span>
                  <span className="project-main">
                    <strong>{project.name}</strong>
                    <small>
                      {project.school} · {project.year}
                    </small>
                  </span>
                  <span className="project-budget">{project.budget}</span>
                  <StatusBadge
                    status={
                      project.status === "Completed" ? "Active" : "Pending"
                    }
                  />
                  <span className="project-actions">
                    <button
                      type="button"
                      aria-label={`Edit ${project.name}`}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        setProjectSaveError("");
                        startProjectEdit(project);
                      }}
                    >
                      <Pencil />
                    </button>
                    <button
                      type="button"
                      aria-label={`Delete ${project.name}`}
                      className="project-delete-button"
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        void deleteProject(projectKey);
                      }}
                    >
                      <Trash2 />
                    </button>
                  </span>
                  <ChevronDown className="project-chevron" />
                </summary>
                <div className="project-details">
                  {isEditing && draft ? (
                    <div className="project-inline-form">
                      <label>
                        Project name
                        <input
                          value={draft.name}
                          onChange={(event) =>
                            updateProjectDraft("name", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        School
                        <select
                          value={draft.school}
                          onChange={(event) =>
                            updateProjectDraft("school", event.target.value)
                          }
                        >
                          {registrySchools.map((registrySchool) => (
                            <option
                              key={registrySchool.id}
                              value={registrySchool.displayName}
                            >
                              {registrySchool.displayName}
                            </option>
                          ))}
                        </select>
                      </label>
                      <label>
                        Year
                        <input
                          value={draft.year}
                          onChange={(event) =>
                            updateProjectDraft("year", event.target.value)
                          }
                        />
                      </label>
                      <label>
                        Term
                        <select
                          value={draft.term}
                          onChange={(event) =>
                            updateProjectDraft("term", event.target.value)
                          }
                        >
                          {terms
                            .filter((term) => {
                              const academicYearId = academicYears.find(
                                (year) => year.name === draft.year,
                              )?.id;
                              return term.academicYearId === academicYearId;
                            })
                            .map((term) => (
                              <option key={term.id} value={term.name}>
                                {term.name}
                              </option>
                            ))}
                        </select>
                      </label>
                      <label>
                        Status
                        <select
                          value={draft.status}
                          onChange={(event) =>
                            updateProjectDraft("status", event.target.value)
                          }
                        >
                          <option>Completed</option>
                          <option>In progress</option>
                          <option>Cancelled</option>
                        </select>
                      </label>
                      <label>
                        Budget
                        <input
                          value={draft.budget}
                          onChange={(event) =>
                            updateProjectDraft("budget", event.target.value)
                          }
                        />
                      </label>
                      <label className="project-inline-wide">
                        Project details
                        <textarea
                          value={draft.detail}
                          onChange={(event) =>
                            updateProjectDraft("detail", event.target.value)
                          }
                        />
                      </label>
                      <div className="project-inline-actions">
                        <button type="button" onClick={cancelProjectEdit}>
                          <X />
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => void saveProjectEdit()}
                          disabled={savingProject}
                        >
                          <Save />
                          Save changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="project-detail-card">
                      <div className="project-detail-copy">
                        <span className="project-detail-label">
                          Project details
                        </span>
                        <p>{project.detail}</p>
                      </div>
                      <div className="project-detail-meta">
                        <span>
                          <b>School</b>
                          {project.school}
                        </span>
                        <span>
                          <b>Year</b>
                          {project.year}
                        </span>
                        <span>
                          <b>Term</b>
                          {project.term}
                        </span>
                        <span>
                          <b>Budget</b>
                          {project.budget}
                        </span>
                        <span>
                          <b>Category</b>
                          {project.category ?? "Not recorded"}
                        </span>
                        <span>
                          <b>Contractor</b>
                          {project.contractor ?? "Not recorded"}
                        </span>
                        <span>
                          <b>Condition</b>
                          {project.condition ?? "Not recorded"}
                        </span>
                        <span>
                          <b>Started</b>
                          {project.dateStarted ?? "Not recorded"}
                        </span>
                        <span>
                          <b>Completed</b>
                          {project.dateCompleted ?? "Not recorded"}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </section>
    </div>
  );
}

export default InfrastructureContent;
