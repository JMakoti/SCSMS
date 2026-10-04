import type { ReportDetail } from "../../types/fixtures";

const defaultReport: Omit<
  ReportDetail,
  "key" | "title" | "code" | "description"
> = {
  category: "Operational",
  owner: "Sub-County Education Office",
  reportingPeriod: "Academic Year 2026",
  frequency: "Termly",
  recordsIncluded: "128 schools",
  lastGenerated: "18 September 2026",
  nextDue: "31 December 2026",
  status: "Ready for export",
  format: "PDF and XLSX",
  dataSources: [
    "School registry",
    "Enrollment returns",
    "Staff records",
    "Infrastructure records",
  ],
  sections: ["Summary", "Ward breakdown", "School-level records"],
  filters: ["Ward", "Academic year"],
  metrics: ["Total schools", "Total students", "Teaching staff"],
  previewColumns: ["Code", "Name", "Ward", "Status"],
  visualizations: ["Summary cards", "Table preview"],
  distribution: "Education officer, ward officers, records office",
  retention: "7 years",
  projectTitle: "Sub-County School Management System",
  projectSubtitle:
    "Offline-first desktop application for sub-county school information management",
  executiveSummary:
    "The system helps education officers manage schools, staff, students, enrollment, infrastructure, contacts and administrative reports from one centralized Windows desktop application. It is designed for unreliable internet environments, stores operational data locally in SQLite, and synchronizes with an online PostgreSQL database through a controlled sync API.",
  architecture: ["Next.js", "Tauri", "SQLite", "Sync API", "PostgreSQL"],
  primaryGoal:
    "Develop a reliable offline-first school management system that remains fully usable without internet access while maintaining a synchronized online copy of the data.",
  objectives: [
    "Centralize school, enrollment, staff, contacts and infrastructure records.",
    "Support continuous offline work on a dedicated Windows computer.",
    "Synchronize local changes with an online PostgreSQL database.",
    "Provide dashboards, search, filtering, reports, import, export and backups.",
    "Track important record changes through audit history and sync status.",
  ],
  scopeAreas: [
    {
      title: "School management",
      items: [
        "Registration details",
        "School code and name",
        "Level, type, ward and status",
        "Location and contacts",
      ],
    },
    {
      title: "Student enrollment",
      items: [
        "Academic year",
        "Term",
        "Grade or class",
        "Male, female and total enrollment",
      ],
    },
    {
      title: "Staff management",
      items: [
        "Teaching staff",
        "Non-teaching staff",
        "Designation",
        "Employment type and contact information",
      ],
    },
    {
      title: "Facilities and infrastructure",
      items: [
        "Classrooms and laboratories",
        "Libraries and computer labs",
        "Water, electricity and internet",
        "Infrastructure condition",
      ],
    },
    {
      title: "Reporting",
      items: [
        "Schools by ward, level and type",
        "Enrollment statistics",
        "Staff statistics",
        "Infrastructure statistics",
        "Incomplete information reports",
      ],
    },
    {
      title: "System administration",
      items: [
        "User roles",
        "Audit history",
        "Database backups",
        "Synchronization management",
      ],
    },
  ],
  synchronization: {
    schedule: "Every 24 hours, with a manual Sync Now option",
    localStore: "SQLite local database on the designated Windows computer",
    onlineStore: "PostgreSQL central database accessed through a sync API",
    failureHandling:
      "Failed sync items remain pending in the local sync queue until connectivity and server confirmation are available.",
  },
  controls: [
    "Local authentication",
    "Role-based access",
    "HTTPS-protected synchronization",
    "Audit logs for important actions",
    "Database transactions for related saves",
    "Automated local backups",
  ],
  risks: [
    {
      risk: "Computer failure",
      mitigation: "Automated local backups and online copy",
    },
    {
      risk: "Internet outage",
      mitigation: "Offline-first architecture and local SQLite operation",
    },
    {
      risk: "Failed synchronization",
      mitigation:
        "Sync queue retry and server confirmation before marking synced",
    },
    {
      risk: "Incorrect data entry",
      mitigation: "Validation, audit logs and controlled forms",
    },
  ],
  successCriteria: [
    "Runs reliably on the designated Windows computer.",
    "Operates without an internet connection.",
    "Stores school information locally and preserves data after restarts.",
    "Allows authorized users to manage school records, enrollment and staff.",
    "Generates required reports and exports.",
    "Automatically creates backups and synchronizes online when available.",
    "Shows clear online/offline and pending-change status.",
  ],
};

export const reportDetails = [
  {
    ...defaultReport,
    key: "school-register",
    title: "School Register",
    code: "RPT-SCH-001",
    category: "Registry",
    frequency: "Monthly",
    description:
      "Official list of active schools with registration, location and ownership details.",
    dataSources: ["School registry", "Ward records", "Contact records"],
    filters: ["Ward"],
    metrics: ["Total Schools", "Primary", "Secondary", "Total Students"],
    previewColumns: [
      "Code",
      "Name",
      "Level",
      "Ownership",
      "Ward",
      "Students",
      "Staff",
      "Status",
    ],
    visualizations: ["Summary cards", "School register table"],
    sections: [
      "Registered schools",
      "Ownership summary",
      "Ward distribution",
      "Recently updated records",
    ],
  },
  {
    ...defaultReport,
    key: "enrollment",
    title: "Enrollment Report",
    code: "RPT-ENR-002",
    category: "Enrollment",
    description:
      "Learner counts by school, grade band, gender and reporting term.",
    dataSources: ["Enrollment returns", "School registry"],
    filters: ["Academic year", "Ward"],
    metrics: ["Total Enrolled", "Male", "Female"],
    previewColumns: [
      "School",
      "Level",
      "Ward",
      "Boys",
      "Girls",
      "Total Learners",
      "Year Status",
    ],
    visualizations: [
      "Enrollment by grade bar chart",
      "Gender distribution donut",
    ],
    sections: [
      "Enrollment totals",
      "Gender distribution",
      "Grade band coverage",
      "Ward comparison",
    ],
  },
  {
    ...defaultReport,
    key: "staff",
    title: "Staff Report",
    code: "RPT-STF-003",
    category: "Staffing",
    description:
      "Teaching and non-teaching staff totals, roles and assigned schools.",
    dataSources: ["Staff records", "School registry"],
    filters: ["Ward", "Staff type", "Employment type"],
    metrics: ["Total Staff", "Teaching", "Non-Teaching", "Male / Female"],
    previewColumns: [
      "Staff ID",
      "Name",
      "School",
      "Ward",
      "Designation",
      "Staff Type",
      "Employment Type",
      "Status",
    ],
    visualizations: ["Staff totals", "Employment type donut"],
    sections: [
      "Staff totals",
      "Teaching staff",
      "Non-teaching staff",
      "School assignments",
    ],
  },
  {
    ...defaultReport,
    key: "infrastructure",
    title: "Infrastructure Report",
    code: "RPT-INF-004",
    category: "Infrastructure",
    description:
      "Facilities, infrastructure condition and school improvement projects.",
    dataSources: [
      "Infrastructure records",
      "Project records",
      "School registry",
    ],
    filters: ["Ward"],
    metrics: ["Facilities", "Good Condition", "Needs Repair", "Completed"],
    previewColumns: ["Facility", "Available", "Good", "Needs Repair", "Status"],
    visualizations: ["Classroom condition donut", "Facilities coverage bars"],
    sections: [
      "Facility condition",
      "Repair needs",
      "Active projects",
      "Completed projects",
    ],
  },
  {
    ...defaultReport,
    key: "ward-summary",
    title: "Ward Summary",
    code: "RPT-WRD-005",
    category: "Ward",
    description:
      "Ward-level summary of schools, learners, staff and data completeness.",
    dataSources: ["Ward records", "School registry", "Enrollment returns"],
    filters: ["Academic year"],
    metrics: ["Schools", "Students", "Teaching", "Non-Teaching"],
    previewColumns: ["Ward", "Schools", "Students", "Teaching", "Non-Teaching"],
    visualizations: ["Ward summary table"],
    sections: [
      "Ward overview",
      "Schools by ward",
      "Learner totals",
      "Data completeness",
    ],
  },
  {
    ...defaultReport,
    key: "school-type",
    title: "School Type Analysis",
    code: "RPT-TYP-006",
    category: "School type",
    description:
      "Distribution of public, private, faith-based and community schools.",
    dataSources: ["School registry", "Ward records"],
    filters: ["Ward"],
    metrics: ["Public", "Private", "Faith-Based", "Community"],
    previewColumns: ["School Type", "Schools", "Share"],
    visualizations: ["School type donut", "School type count cards"],
    sections: [
      "Type distribution",
      "Public schools",
      "Private schools",
      "Faith-based schools",
      "Community schools",
    ],
  },
  {
    ...defaultReport,
    key: "data-quality",
    title: "Data Quality Report",
    code: "RPT-DQL-007",
    category: "Data quality",
    frequency: "Weekly",
    status: "Needs review",
    description:
      "Missing, stale and incomplete education management records for follow-up.",
    dataSources: ["School registry", "Contact records", "Enrollment returns"],
    filters: ["Ward", "Completeness status"],
    metrics: [
      "Overall Quality",
      "Has school code",
      "Has phone number",
      "Has email address",
      "Has enrollment data",
    ],
    previewColumns: ["Check", "Passed", "Total", "Completion"],
    visualizations: ["Overall quality progress ring", "Completeness bars"],
    sections: [
      "Completeness score",
      "Missing fields",
      "Stale records",
      "Follow-up priorities",
    ],
  },
] satisfies ReportDetail[];

export function getReportDetail(title: string) {
  return (
    reportDetails.find((report) => report.title === title) ?? {
      ...defaultReport,
      key: title.toLowerCase().replace(/\s+/g, "-"),
      title,
      code: `RPT-${title
        .split(/\s+/)
        .map((part) => part.charAt(0).toUpperCase())
        .join("")}-000`,
      description: "Official education management report.",
    }
  );
}
