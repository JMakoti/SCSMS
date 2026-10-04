"use client";

import { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  UserCog,
  Users,
} from "lucide-react";
import { staffRecords } from "../data/fixtures/staff";
import StatusBadge from "../ui/status-badge";
import { ExportMenu } from "../ui/export-menu";

type StaffContentProps = {
  variant?: "page" | "school-profile";
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function StaffContent({ variant = "page" }: StaffContentProps) {
  const records = staffRecords;
  const [search, setSearch] = useState("");
  const [staffPage, setStaffPage] = useState(1);
  const staffPageSize = 3;
  const filteredRecords = records.filter((record) =>
    [record.name, record.role, record.type, record.phone, record.status]
      .join(" ")
      .toLowerCase()
      .includes(search.trim().toLowerCase()),
  );
  const totalStaffPages = Math.max(
    1,
    Math.ceil(filteredRecords.length / staffPageSize),
  );
  const currentStaffPage = Math.min(staffPage, totalStaffPages);
  const paginatedRecords = filteredRecords.slice(
    (currentStaffPage - 1) * staffPageSize,
    currentStaffPage * staffPageSize,
  );
  const teachingCount = records.filter(
    (record) => record.type === "Teaching",
  ).length;
  const nonTeachingCount = records.length - teachingCount;

  if (variant === "school-profile") {
    return (
      <section className="panel school-staff-panel">
        <div className="panel-header school-staff-header">
          <div>
            <h2>School staff</h2>
            <p>Staff assigned to Mwangaza Primary School</p>
          </div>
          <div className="school-staff-metrics" aria-label="Staff summary">
            <span>
              <strong>{records.length}</strong>
              Total
            </span>
            <span>
              <strong>{teachingCount}</strong>
              Teaching
            </span>
            <span>
              <strong>{nonTeachingCount}</strong>
              Non-teaching
            </span>
          </div>
        </div>
        <div className="school-staff-table">
          <div className="school-staff-table-head">
            <span>Staff member</span>
            <span>Role</span>
            <span>Category</span>
            <span>Contact</span>
            <span>Status</span>
          </div>
          {paginatedRecords.map((record) => (
            <div className="school-staff-table-row" key={record.name}>
              <div className="school-staff-member">
                <span className="school-staff-avatar">
                  {getInitials(record.name)}
                </span>
                <strong>{record.name}</strong>
              </div>
              <span>{record.role}</span>
              <span
                className={`staff-category-pill ${record.type === "Teaching" ? "teaching" : "non-teaching"}`}
              >
                {record.type}
              </span>
              <span className="school-staff-contact">{record.phone}</span>
              <StatusBadge status={record.status} />
            </div>
          ))}
        </div>
        <div className="pagination school-staff-pagination">
          <span>
            Showing {(currentStaffPage - 1) * staffPageSize + 1}-
            {Math.min(currentStaffPage * staffPageSize, records.length)} of{" "}
            {records.length} staff records
          </span>
          <div className="page-buttons">
            <button
              aria-label="Previous staff page"
              disabled={currentStaffPage === 1}
              onClick={() => setStaffPage((page) => Math.max(1, page - 1))}
            >
              <ChevronLeft />
            </button>
            {Array.from(
              { length: totalStaffPages },
              (_, index) => index + 1,
            ).map((page) => (
              <button
                className={currentStaffPage === page ? "current" : ""}
                key={page}
                onClick={() => setStaffPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              aria-label="Next staff page"
              disabled={currentStaffPage === totalStaffPages}
              onClick={() =>
                setStaffPage((page) => Math.min(totalStaffPages, page + 1))
              }
            >
              <ChevronRight />
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="content">
      <div className="staff-summary-grid">
        <div className="staff-summary-card teaching">
          <span className="staff-summary-icon">
            <UserCog />
          </span>
          <div>
            <strong>{teachingCount}</strong>
            <span>Teaching staff</span>
            <small>Assigned to this school</small>
          </div>
        </div>
        <div className="staff-summary-card non-teaching">
          <span className="staff-summary-icon">
            <Users />
          </span>
          <div>
            <strong>{nonTeachingCount}</strong>
            <span>Non-teaching staff</span>
            <small>Assigned to this school</small>
          </div>
        </div>
      </div>
      <section className="panel staff-record-panel">
        <div className="panel-header">
          <div>
            <h2>Staff records</h2>
            <p>
              {records.length} records shown · Contact and employment
              information
            </p>
          </div>
          <ExportMenu
            title="Staff records"
            filename="staff-records"
            headers={["Staff member", "Role", "Category", "Contact", "Status"]}
            rows={filteredRecords.map((record) => [
              record.name,
              record.role,
              record.type,
              record.phone,
              record.status,
            ])}
          />
        </div>
        <label className="module-search" htmlFor="staff-record-search">
          <Search aria-hidden="true" />
          <span className="sr-only">Search staff records</span>
          <input
            id="staff-record-search"
            type="search"
            placeholder="Search staff records"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setStaffPage(1);
            }}
          />
        </label>
        <div className="staff-table">
          <div className="staff-table-head">
            <span>Staff member</span>
            <span>Role</span>
            <span>Category</span>
            <span>Contact</span>
            <span>Status</span>
          </div>
          {filteredRecords.map((record) => (
            <div className="staff-table-row" key={record.name}>
              <div className="staff-person">
                <span>{getInitials(record.name)}</span>
                <strong>{record.name}</strong>
              </div>
              <span>{record.role}</span>
              <span>{record.type}</span>
              <span>{record.phone}</span>
              <StatusBadge status={record.status} />
            </div>
          ))}
          {filteredRecords.length === 0 && (
            <div className="empty-state">
              <Search aria-hidden="true" />
              <strong>No staff records found</strong>
              <span>Try a different staff member, role, or contact.</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default StaffContent;
