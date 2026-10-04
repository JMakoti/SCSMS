import type { AcademicYear } from "../../types/enterprise";

export const academicYears = [
  {
    id: "ay-2025",
    name: "2025",
    startDate: "2025-01-01",
    endDate: "2025-12-31",
    isActive: false,
    isClosed: true,
    createdAt: "2025-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "ay-2026",
    name: "2026",
    startDate: "2026-01-01",
    endDate: "2026-12-31",
    isActive: true,
    isClosed: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-09-20T00:00:00.000Z",
  },
] satisfies AcademicYear[];

export const activeAcademicYear =
  academicYears.find((year) => year.isActive) ?? academicYears[0];
