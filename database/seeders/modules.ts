import type { ModuleSeederConfig } from "../../packages/features/types/seeders";

export const moduleSeeders = {
  Enrollment: {
    icon: "Users",
    desc: "Capture and review learner enrollment by school, grade and term",
    action: "Add Enrollment",
    items: [],
  },
  Staff: {
    icon: "UserCog",
    desc: "Manage teaching and non-teaching staff records across schools",
    action: "Add Staff",
    items: ["John Kamau", "Grace Wanjiku", "Peter Otieno", "Amina Hassan"],
  },
  Infrastructure: {
    icon: "Building2",
    desc: "Track school facilities, utilities and infrastructure condition",
    action: "Add Infrastructure",
    items: [],
  },
  Ward: {
    icon: "MapPinned",
    desc: "Review school distribution and records by ward",
    action: "Add Ward Record",
    items: ["Ward A", "Ward B", "Ward C", "Ward D", "Ward E"],
  },
  "School Contacts": {
    icon: "BookOpen",
    desc: "Maintain official school contact information and roles",
    action: "Add Contact",
    items: [],
  },
  Reports: {
    icon: "FileBarChart2",
    desc: "Generate, preview and export official education management reports",
    action: "Generate Report",
    items: [
      "School Register",
      "Enrollment Report",
      "Staff Report",
      "Infrastructure Report",
      "Ward Summary",
      "School Type Analysis",
      "Data Quality Report",
    ],
  },
  "Data Quality": {
    icon: "ClipboardCheck",
    desc: "Monitor completeness and accuracy of education records",
    action: "Review records",
    items: [
      "Schools missing contacts",
      "Schools missing enrollment",
      "Schools missing infrastructure",
      "Incomplete staff records",
    ],
  },
  "Audit Logs": {
    icon: "History",
    desc: "Track all changes made to education records and system settings",
    action: "Export Logs",
    items: [
      "Updated School SCH-001",
      "Added enrollment record",
      "Imported 18 school records",
      "Sync completed",
    ],
  },
  "Users & Roles": {
    icon: "UserCog",
    desc: "Manage system users, roles and access permissions",
    action: "Add User",
    items: [
      "Education Officer",
      "Data Entry Officer",
      "County Administrator",
      "Records Viewer",
    ],
  },
  Settings: {
    icon: "Settings",
    desc: "Configure application preferences, validation and security",
    action: "Save settings",
    items: [
      "General",
      "Appearance",
      "Data & validation",
      "Synchronization",
      "Backup",
      "Security",
    ],
  },
  "System Information": {
    icon: "Server",
    desc: "Application health, storage and system information",
    action: "Refresh status",
    items: [
      "Application Healthy",
      "Local Database Healthy",
      "Storage Healthy",
      "Synchronization Healthy",
    ],
  },
} satisfies Record<string, ModuleSeederConfig>;
