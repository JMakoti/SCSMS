"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { AddWardDialog } from "../dialogs/ward-dialogs";
import { moduleSeeders } from "../data/fixtures/modules";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { getRabaiWardSummaries, rabaiSchools } from "../data/fixtures/rabai-schools";
import { addStaffSchema } from "../schemas/add-staff-schema";
import type { AddStaffFormValues } from "../types/forms";
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
export function GenericPage({
  active,
  setActive,
  onDetail,
}: {
  active: string;
  setActive: (v: string) => void;
  onDetail?: (item: string) => void;
}) {
  const [showStaffModal, setShowStaffModal] = useState(false);
  const [showWardModal, setShowWardModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { currentAcademicYear } = useAcademicYear();
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
    {
      icon: React.ElementType;
      desc: string;
      action: string;
      items: readonly string[];
    }
  >;
  const c = configs[active] || configs.Reports;
  const Icon = c.icon;
  const wardSummaries =
    active === "Ward" ? getRabaiWardSummaries(currentAcademicYear.id) : [];
    
  const schoolRegistryItems =
    active === "Infrastructure" || active === "School Contacts" || active === "School Performance"
      ? [...rabaiSchools]
        .sort((a, b) => a.displayName.localeCompare(b.displayName))
        .map((school) => school.displayName)
      : [];

  const moduleItems =
    active === "Ward"
      ? wardSummaries.map((ward) => ward.name)
      : schoolRegistryItems.length
        ? schoolRegistryItems
        : c.items;
  const normalizedQuery = searchQuery.trim().toLowerCase();
  const filteredModuleItems = moduleItems.filter((item, index) => {
    if (!normalizedQuery) return true;
    const ward = active === "Ward" ? wardSummaries[index] : null;
    const details = ward
      ? `${ward.wardCode ?? ""} ${ward.schoolCount} ${ward.studentCount} ${ward.teacherCount}`
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
        <AddStaffDialog onClose={() => setShowStaffModal(false)} />
      )}
      {showWardModal && (
        <AddWardDialog onClose={() => setShowWardModal(false)} />
      )}
      <div className="module-summary">
        <div className="summary-icon">
          <Icon />
        </div>
        <div>
          <strong>
            {active === "Data Quality"
              ? "86%"
              : active === "Audit Logs"
                ? "1,284"
                : active === "Reports"
                  ? "8"
                  : active === "Ward"
                    ? String(wardSummaries.length)
                    : "Active module"}
          </strong>
          <span>
            {active === "Data Quality"
              ? "Overall data completeness"
              : active === "Audit Logs"
                ? "Events this month"
                : active === "Ward"
                  ? "Wards with registered schools"
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
          {filteredModuleItems.length === 0 ? (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <strong>No {active.toLowerCase()} records found</strong>
              <span>Try a different search term.</span>
            </div>
          ) : filteredModuleItems.map((item) => {
            const i = moduleItems.indexOf(item);
            const ward = active === "Ward" ? wardSummaries[i] : null;

            return (
              <div className="module-row" key={item}>
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
                          ? `${ward?.wardCode ? `Ward ${ward.wardCode} - ` : ""}${ward?.schoolCount ?? 0} schools - ${ward?.studentCount.toLocaleString() ?? 0} demo learners - ${ward?.teacherCount.toLocaleString() ?? 0} demo teachers`
                          : `Record reference ${String(i + 1).padStart(3, "0")} - Updated ${i + 1}h ago`}
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

function AddStaffDialog({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<AddStaffFormValues>({
    resolver: zodResolver(addStaffSchema),
    defaultValues: {
      designation: "Teacher",
      assignedSchool: "",
      employmentType: "Permanent",
      employer: "Goverment_Tsc",
    },
  });
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
          <form onSubmit={handleSubmit(() => setSaved(true))}>
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
                    {[...rabaiSchools]
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
              <button className="modal-primary-button" type="submit">
                Save staff
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default GenericPage;
