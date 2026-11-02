import type { FeatureData } from "../data/feature-data-context";
import { isRecorded, schoolCompleteness } from "../data/completeness";

export type SchoolNotification = {
  id: string;
  title: string;
  description: string;
  schoolName: string;
  category: "enrollment" | "school" | "contacts" | "staff" | "infrastructure" | "sync";
  severity: "error" | "warning" | "info";
  href: string;
};

export function notificationReadToken(notification: SchoolNotification) {
  return JSON.stringify([notification.id, notification.title, notification.description]);
}

function groupBySchool<T extends { schoolId: string }>(rows: T[]) {
  const grouped = new Map<string, T[]>();
  for (const row of rows) {
    const group = grouped.get(row.schoolId) ?? [];
    group.push(row);
    grouped.set(row.schoolId, group);
  }
  return grouped;
}

export function buildSchoolNotifications(
  data: Pick<FeatureData, "schools" | "enrollmentRows" | "infrastructureFacilities" | "staff" | "contacts" | "syncRecords">,
  academicYearId: string,
  academicYearName: string,
): SchoolNotification[] {
  const notifications: SchoolNotification[] = [];
  const enrollment = groupBySchool(
    data.enrollmentRows.filter((row) => row.academicYearId === academicYearId),
  );
  const infrastructure = groupBySchool(
    data.infrastructureFacilities.filter((row) => row.academicYearId === academicYearId),
  );
  const staffed = new Set(data.staff.map((record) => record.schoolId));
  const contactable = new Set(data.contacts.filter((record) =>
    record.isActive && (isRecorded(record.phone) || isRecorded(record.phone2)),
  ).map((record) => record.schoolId));

  for (const school of data.schools.filter((record) => record.isActive)) {
    const rows = enrollment.get(school.id) ?? [];
    const facilities = infrastructure.get(school.id) ?? [];
    const href = (tab: string) => `/schools?school=${encodeURIComponent(school.id)}&tab=${tab}`;
    const add = (
      category: SchoolNotification["category"], title: string, description: string,
      tab: string, severity: SchoolNotification["severity"] = "warning",
    ) => notifications.push({
      id: `${academicYearId}:${school.id}:${category}`, category, severity,
      schoolName: school.displayName, title, description, href: href(tab),
    });

    if (!rows.length) {
      add("enrollment", "Enrollment has not been added", `Add enrollment by grade for ${academicYearName}.`, "Enrollment");
    } else if (rows.some((row) => row.total !== row.male + row.female)) {
      add("enrollment", "Enrollment totals need correction", `Some grade totals do not match boys plus girls for ${academicYearName}.`, "Enrollment");
    } else if (rows.every((row) => row.total === 0)) {
      // New schools receive zero-filled rows. Zero may also be an intentional recorded value.
      add("enrollment", "Review enrollment counts", `All recorded grade counts are zero for ${academicYearName}. Confirm these figures or enter learner counts.`, "Enrollment", "info");
    }

    if (!facilities.length) {
      add("infrastructure", "Infrastructure records missing", `Add facility records for ${academicYearName}.`, "Infrastructure");
    } else {
      const repairs = facilities.filter((row) => row.needsRepair > 0);
      if (repairs.length) {
        add("infrastructure", "Facilities need repair", `${repairs.map((row) => `${row.facility}: ${row.needsRepair}`).join("; ")} (${academicYearName}).`, "Infrastructure");
      }
    }
    if (!staffed.has(school.id)) {
      add("staff", "Staff records missing", "Add the staff roster for this school.", "Staff");
    }
    if (!contactable.has(school.id) && !isRecorded(school.phone) && !isRecorded(school.email)) {
      add("contacts", "School contact details missing", "Add a school phone number, email, or an active contact with a phone number.", "Contacts");
    }
    const missing = schoolCompleteness(school, Boolean(rows.length), Boolean(facilities.length))
      .groups.filter((group) => group.target === "Overview")
      .flatMap((group) => group.missing).filter((field) => field !== "Phone" && field !== "Email");
    if (missing.length) {
      add("school", "School details incomplete", `Missing: ${missing.join(", ")}.`, "Overview", "info");
    }
  }
  const failed = data.syncRecords.filter((record) => record.status.toLowerCase() === "failed");
  if (failed.length) {
    notifications.push({
      id: "sync:failed", category: "sync", severity: "error", schoolName: "Synchronization",
      title: "Records failed to sync", description: `${failed.length} record${failed.length === 1 ? " needs" : "s need"} attention. Review the sync queue and retry.`,
      href: "/synchronization",
    });
  }
  const priority = { error: 0, warning: 1, info: 2 };
  return notifications.sort((a, b) => priority[a.severity] - priority[b.severity] || a.schoolName.localeCompare(b.schoolName) || a.title.localeCompare(b.title));
}
