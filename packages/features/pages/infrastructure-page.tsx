"use client";

import { useState } from "react";
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
import {
  infrastructureFacilityRows,
  infrastructureProjects,
} from "../../../database/seeders/infrastructure";
import { rabaiSchools } from "../../../database/seeders/rabai-schools";
import { infrastructureProjectSchema } from "../schemas/infrastructure-project-schema";
import type { InfrastructureProjectFormValues } from "../types/forms";
import type {
  InfrastructureFacilityRow,
  InfrastructureProjectRecord,
} from "../types/seeders";
import StatusBadge from "../ui/status-badge";
import { ExportMenu } from "../ui/export-menu";

const registrySchools = [...rabaiSchools].sort((a, b) =>
  a.displayName.localeCompare(b.displayName),
);
const defaultInfrastructureSchool =
  registrySchools[0]?.displayName ?? "Not provided";

export function AddInfrastructureDialog({
  onClose,
  selectedSchool = defaultInfrastructureSchool,
}: {
  onClose: () => void;
  selectedSchool?: string;
}) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<InfrastructureProjectFormValues>({
    resolver: zodResolver(infrastructureProjectSchema),
    defaultValues: {
      selectedSchool,
      category: "Classrooms",
      status: "Active",
      term: "Term 1",
      targetYear: 2026,
    },
  });
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
            <p>The project has been added to the synchronization queue.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSaved(true))}>
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
                    <option>Term 1</option>
                    <option>Term 2</option>
                    <option>Term 3</option>
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
                    min="2026"
                    placeholder="2026"
                  />
                </label>
                <label>
                  Year Started
                  <input
                    {...register("dateStarted", { valueAsNumber: true })}
                    type="date"
                  />
                </label>
                <label>
                  Completed Date
                  <input
                    {...register("dateCompleted", { valueAsNumber: true })}
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
              <button className="modal-primary-button" type="submit">
                Save project
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
  school = defaultInfrastructureSchool,
}: {
  detail?: boolean;
  school?: string;
}) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [facilityRows, setFacilityRows] = useState<InfrastructureFacilityRow[]>(
    infrastructureFacilityRows,
  );
  const [editingFacility, setEditingFacility] = useState<string | null>(null);
  const [facilityDraft, setFacilityDraft] =
    useState<InfrastructureFacilityRow | null>(null);
  const [projects, setProjects] = useState<InfrastructureProjectRecord[]>(
    infrastructureProjects,
  );
  const [editingProject, setEditingProject] = useState<string | null>(null);
  const [projectDraft, setProjectDraft] =
    useState<InfrastructureProjectRecord | null>(null);
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
  const saveFacilityEdit = () => {
    if (!facilityDraft || !editingFacility) return;
    setFacilityRows((current) =>
      current.map((row) =>
        row.facility === editingFacility ? facilityDraft : row,
      ),
    );
    setEditingFacility(null);
    setFacilityDraft(null);
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
  const saveProjectEdit = () => {
    if (!projectDraft || !editingProject) return;
    setProjects((current) =>
      current.map((project) =>
        project.name === editingProject ? projectDraft : project,
      ),
    );
    setEditingProject(null);
    setProjectDraft(null);
  };
  const cancelProjectEdit = () => {
    setEditingProject(null);
    setProjectDraft(null);
  };
  const deleteProject = (projectName: string) => {
    setProjects((current) =>
      current.filter((project) => project.name !== projectName),
    );
    if (editingProject === projectName) cancelProjectEdit();
  };

  return (
    <div
      className={`infrastructure-page ${detail ? "infrastructure-detail-page" : "infrastructure-standalone-page"}`}
    >
      {showAddModal && (
        <AddInfrastructureDialog
          selectedSchool={school}
          onClose={() => setShowAddModal(false)}
        />
      )}
      <section className="panel infrastructure-panel">
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
                      <option>Cancelled</option>
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
                      <button type="button" onClick={saveFacilityEdit}>
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
            const isEditing = editingProject === project.name;
            const draft = isEditing ? projectDraft : null;

            return (
              <details
                className="infrastructure-project"
                key={project.name}
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
                        deleteProject(project.name);
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
                          <option>Term 1</option>
                          <option>Term 2</option>
                          <option>Term 3</option>
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
                        <button type="button" onClick={saveProjectEdit}>
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
