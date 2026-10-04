import type {
  InfrastructureFacilityRow,
  InfrastructureProjectRecord,
} from "../../types/fixtures";
import { rabaiSchools } from "./rabai-schools";

const registrySchools = [...rabaiSchools].sort((a, b) =>
  a.displayName.localeCompare(b.displayName),
);

const getRegistrySchoolName = (index: number) =>
  registrySchools[index % registrySchools.length]?.displayName ??
  "Not provided";

export const infrastructureFacilityRows = [
  {
    facility: "Classrooms",
    available: 18,
    good: 15,
    needsRepair: 3,
    status: "Active",
  },
  {
    facility: "Toilets",
    available: 12,
    good: 10,
    needsRepair: 2,
    status: "Active",
  },
  {
    facility: "Teachers' houses",
    available: 6,
    good: 5,
    needsRepair: 1,
    status: "Active",
  },
  {
    facility: "Library",
    available: 1,
    good: 1,
    needsRepair: 0,
    status: "Completed",
  },
  {
    facility: "Water points",
    available: 4,
    good: 3,
    needsRepair: 1,
    status: "Pending",
  },
  {
    facility: "Electricity connection",
    available: 1,
    good: 1,
    needsRepair: 0,
    status: "Completed",
  },
] satisfies InfrastructureFacilityRow[];

export const infrastructureProjects = [
  {
    name: "New classroom block",
    school: getRegistrySchoolName(0),
    year: "2026",
    term: "Term 1",
    status: "Completed",
    budget: "KES 4.8M",
    detail:
      "Three additional classrooms completed for the Grade 1-6 primary cycle.",
  },
  {
    name: "Water harvesting system",
    school: getRegistrySchoolName(1),
    year: "2026",
    term: "Term 2",
    status: "In progress",
    budget: "KES 1.6M",
    detail:
      "Roof catchment and storage tanks being installed to improve water access.",
  },
  {
    name: "Library renovation",
    school: getRegistrySchoolName(2),
    year: "2025",
    term: "Term 3",
    status: "Completed",
    budget: "KES 980K",
    detail:
      "Reading room renovated with new lighting, shelving, and study desks.",
  },
  {
    name: "Sanitation improvement",
    school: getRegistrySchoolName(3),
    year: "2025",
    term: "Term 2",
    status: "Completed",
    budget: "KES 2.1M",
    detail: "Additional sanitation blocks and handwashing stations delivered.",
  },
] satisfies InfrastructureProjectRecord[];
