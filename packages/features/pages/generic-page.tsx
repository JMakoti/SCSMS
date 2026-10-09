"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { AddWardDialog } from "../dialogs/ward-dialogs";
import { useFeatureData, type WardSummary } from "../data/feature-data-context";
import { addStaffSchema } from "../schemas/add-staff-schema";
import type { AddStaffFormValues, AddWardFormValues } from "../types/forms";
import {
  BookOpen,
  Building2,
  Check,
  ChevronRight,
  ClipboardCheck,
  FileBarChart2,
  History,
  MapPinned,
  Plus,
  Search,
  Settings,
  Server,
  UserCog,
  Users,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import PageHeader from "../ui/page-header";

const moduleSeeders = {
  Enrollment: { icon: "Users", desc: "Capture and review learner enrollment by school, grade and term", action: "Add Enrollment" },
  Staff: { icon: "UserCog", desc: "Manage teaching and non-teaching staff records across schools", action: "Add Staff" },
  Infrastructure: { icon: "Building2", desc: "Track school facilities, utilities and infrastructure condition", action: "Add Infrastructure" },
  Ward: { icon: "MapPinned", desc: "Review school distribution and records by ward", action: "Add Ward Record" },
  "School Contacts": { icon: "BookOpen", desc: "Maintain official school contact information and roles", action: "Add Contact" },
  Reports: { icon: "FileBarChart2", desc: "Generate, preview and export official education management reports", action: "Generate Report" },
  "Data Quality": { icon: "ClipboardCheck", desc: "Monitor completeness and accuracy of education records", action: "Review records" },
  "Audit Logs": { icon: "History", desc: "Track all changes made to education records and system settings", action: "Export Logs" },
  "Users & Roles": { icon: "UserCog", desc: "Manage system users, roles and access permissions", action: "Add User" },
  Settings: { icon: "Settings", desc: "Configure application preferences, validation and security", action: "Save settings" },
  "System Information": { icon: "Server", desc: "Application health, storage and system information", action: "Refresh status" },
} as const;
export function GenericPage({
  active,
  setActive,
  onDetail,
  wardRecords,
  onSaveWard,
  onSaveStaff,
  wardLoading = false,
  wardLoadError = "",
}: {
  active: string;
  setActive: (v: string) => void;
  onDetail?: (item: string) => void;
  wardRecords?: WardSummary[];
  onSaveWard?: (values: AddWardFormValues) => Promise<void>;
  onSaveStaff?: (values: AddStaffFormValues) => Promise<void>;
  wardLoading?: boolean;
  wardLoadError?: string;
}) {
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { schools, staff, wards, moduleRecords, reportTemplates } =
    useFeatureData();
  const icons = {
    BookOpen,
    Building2,
    ClipboardCheck,
    FileBarChart2,
    History,
    MapPinned,
    Settings,
    Server,
    UserCog,
    Users,
  };
  const configs = Object.fromEntries(
    Object.entries(moduleSeeders).map(([key, config]) => [
      key,
      { ...config, icon: icons[config.icon] },
    ]),
  ) as Record<
    string,
    { icon: React.ElementType; desc: string; action: string }
  >;
  const c = configs[active] || configs.Reports;
  const Icon = c.icon;
  const wardSummaries =
    active === "Ward"
      ? (wardRecords ?? wards)
      : [];
    
  const schoolRegistryItems =
    active === "Infrastructure" || active === "School Contacts" || active === "School Performance"
      ? [...schools]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((school) => school.displayName)
      : [];

  const moduleItems =
    active === "Ward"
      ? wardSummaries.map((ward) => ward.name)
      : schoolRegistryItems.length
        ? schoolRegistryItems
        : (moduleRecords[active] ?? []);
  const staffByName = new Map(staff.map((record) => [record.name, record]));
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredModuleItems = moduleItems
    .map((item, index) => ({ item, index }))
    .filter(({ item, index }) => {
      if (!normalizedQuery) return true;
      const ward = active === "Ward" ? wardSummaries[index] : null;
      const staffRecord = active === "Staff" ? staffByName.get(item) : null;
      const details = ward
        ? `${ward.wardCode ?? ""} ${ward.schoolCount} ${ward.studentCount} ${ward.teacherCount}`
        : staffRecord
          ? `${staffRecord.assignedSchool} ${staffRecord.role} ${staffRecord.phone}`
          : `record reference ${String(index + 1).padStart(3, "0")}`;
      return `${item} ${details}`.toLowerCase().includes(normalizedQuery);
    });
  return (
    <div className="content">
      <PageHeader
        title={active}
        description={c.desc}
        eyebrow="Administration"
        action={
          active === "Staff" ? (
            <Button
              className="edit-school-button"
              onClick={() => setShowStaffModal(true)}
            >
              <Plus data-icon="inline-start" />
              Add Staff
            </Button>
          ) : active === "Ward" ? (
            <Button
              className="edit-school-button"
              onClick={() => setShowWardModal(true)}
            >
              <Plus data-icon="inline-start" />
              Add Ward Record
            </Button>
          ) : (
            <Button>
              <Plus data-icon="inline-start" />
              {c.action}
            </Button>
          )
        }
      />
      {showStaffModal && (
        <AddStaffDialog
          onClose={() => setShowStaffModal(false)}
          onSave={onSaveStaff}
        />
      )}
      {showWardModal && (
        <AddWardDialog
          onClose={() => setShowWardModal(false)}
          onSave={onSaveWard}
        />
      )}
      <div className="module-summary">
        <div className="summary-icon">
          <Icon />
        </div>
        <div>
          <strong>
            {active === "Data Quality"
              ? `${schools.length ? Math.round((schools.reduce((sum, school) => sum + [school.schoolCode, school.phone, school.email, school.ward, school.location].filter(Boolean).length, 0) / (schools.length * 5)) * 100) : 0}%`
              : active === "Audit Logs"
                ? String(moduleItems.length)
                : active === "Reports"
                  ? String(reportTemplates.length)
                  : active === "Ward"
                    ? String(wardSummaries.length)
                    : "Active module"}
          </strong>
          <span>
            {active === "Data Quality"
              ? "Overall data completeness"
              : active === "Audit Logs"
                ? "Events in database"
                : active === "Ward"
                    ? "Wards in database"
                  : "Records available locally"}
          </span>
        </div>
      </div>
      <div className="panel module-table">
        <div className="panel-header">
          <div>
            <h2>
              {active === "Reports"
                ? "Available reports"
                : active === "System Information"
                  ? "System health"
                  : `${active} records`}
            </h2>
          </div>
          <div className="input-wrap compact-search">
            <Search aria-hidden="true" />
            {/* <label className="sr-only" htmlFor="module-record-search">
              Search {active} records
            </label> */}
            <input
              id="module-record-search"
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder={`Search ${active.toLowerCase()} records...`}
            />
          </div>
        </div>
        <div className="module-rows">
          {active === "Ward" && wardLoadError ? (
            <div className="empty-state" role="alert">
              <strong>Ward records could not be loaded</strong>
              <span>{wardLoadError}</span>
            </div>
          ) : active === "Ward" && wardLoading ? (
            <div className="empty-state">Loading ward records...</div>
          ) : filteredModuleItems.length === 0 ? (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <strong>
                {active === "Ward" && !normalizedQuery
                  ? "No ward records yet"
                  : `No ${active.toLowerCase()} records found`}
              </strong>
              <span>
                {active === "Ward" && !normalizedQuery
                  ? "Use Add Ward Record to create the first ward."
                  : "Try a different search term."}
              </span>
            </div>
          ) : filteredModuleItems.map(({ item, index: i }) => {
            const ward = active === "Ward" ? wardSummaries[i] : null;
            const staffRecord = active === "Staff" ? staffByName.get(item) : null;

            return (
              <div className="module-row" key={`${item}-${i}`}>
                <div className={`row-icon tone-${i % 4}`}>
                  <Icon />
                </div>
                <div className="row-main">
                  <strong>{item}</strong>
                  <span>
                    {active === "Reports"
                      ? "Official education management report"
                      : active === "System Information"
                        ? "Last checked 2 minutes ago"
                        : active === "Ward"
                          ? `${ward?.wardCode ? `Ward ${ward.wardCode} - ` : ""}${ward?.schoolCount ?? 0} schools - ${ward?.studentCount.toLocaleString() ?? 0} learners - ${ward?.teacherCount.toLocaleString() ?? 0} teachers`
                          : active === "Staff"
                            ? staffRecord?.assignedSchool || "School not assigned"
                          : "Current database record"}
                  </span>
                </div>
                {active === "System Information" ? (
                  <span className="status-badge status-active">
                    <span className="status-dot" />
                    Healthy
                  </span>
                ) : active === "Data Quality" ? (
                  <span className="status-badge status-warning">
                    <span className="status-dot" />
                    Needs review
                  </span>
                ) : (
                  <button
                    className="row-action"
                    onClick={() => onDetail?.(item)}
                  >
                    {active === "Reports" ? "View report" : "View"}{" "}
                    <ChevronRight />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function AddStaffDialog({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave?: (values: AddStaffFormValues) => Promise<void>;
}) {
  const { schools } = useFeatureData();
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const { register, handleSubmit } = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      designation: "Teacher",
      assignedSchool: "",
      employmentType: "Permanent",
      employer: "Goverment_Tsc",
    },
  });
  const saveStaff = async (values: AddStaffFormValues) => {
    if (!onSave) {
      setSaveError("Staff saving is not configured.");
      return;
    }
    setSaving(true);
    setSaveError("");
    try {
      await onSave(values);
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "The staff record could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="form-dialog add-staff-dialog"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Staff management</span>
            <h2>Add staff member</h2>
            <p>Create a staff record and assign it to a school.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close add staff form"
          >
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>Staff member saved</h3>
            <p>The record has been added to the synchronization queue.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(saveStaff)}>
            {saveError && <p role="alert">{saveError}</p>}
            <div className="form-section">
              <h3>Staff details</h3>
              <div className="form-grid">
                <label>
                  Full name
                  <input
                    {...register("fullName")}
                    autoFocus
                    placeholder="Enter full name"
                  />
                </label>
                <label>
                  Designation
                  <select {...register("designation")}>
                    <option>Teacher</option>
                    <option>Head teacher</option>
                    <option>Deputy head teacher</option>
                    <option>Accounts clerk</option>
                    <option>Support staff</option>
                  </select>
                </label>
                <label>
                  Assigned school
                  <select {...register("assignedSchool")}>
                    <option value="" disabled>
                      Select a school
                    </option>
                    {[...schools]
                      .sort((a, b) =>
                        a.displayName.localeCompare(b.displayName),
                      )
                      .map((school) => (
                        <option key={school.id}>{school.displayName}</option>
                      ))}
                  </select>
                </label>
                <label>
                  Employment type
                  <select {...register("employmentType")}>
                    <option>Permanent</option>
                    <option>Contract</option>
                    <option>Temporary</option>
                  </select>
                </label>
                <label>
                  Employer
                  <select {...register("employer")}>
                    <option value="Goverment_Tsc">Government (TSC)</option>
                    <option value="County_Goverment">County Government</option>
                    <option value="School_Board_Bom">School Board (BOM)</option>
                    <option value="PRIVATE_OWNER">Private Owner</option>
                    <option value="FAITH_BASED">Faith Based Organization</option>
                    <option value="NGO">NGO</option>
                    <option value="AGENCY">Agency</option>
                  </select>
                </label>
                <label>
                  Tsc No.
                  <input
                    {...register("tscNo")}
                    autoFocus
                    placeholder="Enter Tsc No."
                  />
                </label>
                <label>
                  Email address
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  Phone number
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+254 700 000 000"
                  />
                </label>
                <label>
                  Date joined
                  <input
                    {...register("dateJoined")}
                    type="date"
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
                {saving ? "Saving..." : "Save staff"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default GenericPage;
