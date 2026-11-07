// Parent tables precede their dependants for the initial snapshot.
export const tables = [
  "subcounty", "roles", "users", "academic_years", "terms", "wards",
  "schools", "school_subject_combinations", "contacts", "staff",
  "enrollment_snapshots", "enrollment_grade_rows", "infrastructure_snapshots",
  "infrastructure_facility_rows", "infrastructure_projects", "performance_records",
  "performance_subject_rows", "performance_candidates", "performance_candidate_subjects", "performance_candidature_summaries", "report_templates", "report_runs", "settings",
  "data_quality_checks", "dashboard_snapshots", "audit_logs",
];

export function validateRequest(body) {
  if (!body || typeof body !== "object" || typeof body.deviceId !== "string" || !/^[\w-]{1,64}$/.test(body.deviceId) ||
      typeof body.cursor !== "string" || !/^\d{1,18}$/.test(body.cursor) || !Array.isArray(body.changes) || body.changes.length > 100) {
    throw new Error("Invalid sync request");
  }
  for (const change of body.changes) {
    if (!change || !tables.includes(change.table) || !["insert", "update", "delete"].includes(change.operation) ||
        typeof change.id !== "string" || !/^[\w-]{1,64}$/.test(change.id) ||
        typeof change.recordId !== "string" || !/^[\w-]{1,36}$/.test(change.recordId) ||
        (change.operation !== "delete" && (!change.row || typeof change.row !== "object" || Array.isArray(change.row) || change.row.id !== change.recordId))) {
      throw new Error("Invalid sync change");
    }
  }
  if (new Set(body.changes.map((c) => c.id)).size !== body.changes.length) throw new Error("Duplicate event IDs");
}
