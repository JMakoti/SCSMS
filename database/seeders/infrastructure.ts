import type {
  InfrastructureFacilityRow,
  InfrastructureProjectRecord,
} from "../../packages/features/types/seeders";
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
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Administration block",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Staffroom",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Teachers' houses",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Library",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Laboratories",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Computer laboratory",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "ICT room",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Kitchen",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Dining hall",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Assembly hall",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Store",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Washrooms",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Water points",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Borehole",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Water storage tanks",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Electricity connection",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Solar power system",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Sports field",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Security fence",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Main gate",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
  },
  {
    facility: "Garbage disposal area",
    available: 0,
    good: 0,
    needsRepair: 0,
    status: "Pending",
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
