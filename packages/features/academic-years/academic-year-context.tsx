"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AcademicYear } from "../types/enterprise";
import {
  academicYears as seededAcademicYears,
  activeAcademicYear,
} from "../../../database/seeders/academic-years";

type TransitionAcademicYearInput = {
  closingYearId: string;
  name: string;
  startDate: string;
  endDate: string;
};

type AcademicYearContextValue = {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear;
  currentAcademicYear: AcademicYear;
  setCurrentAcademicYearId: (id: string) => void;
  transitionAcademicYear: (input: TransitionAcademicYearInput) => void;
};

const AcademicYearContext = createContext<AcademicYearContextValue | null>(
  null,
);

export function AcademicYearProvider({ children }: { children: ReactNode }) {
  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>(seededAcademicYears);
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState(
    activeAcademicYear.id,
  );
  const currentAcademicYear =
    academicYears.find((year) => year.id === currentAcademicYearId) ??
    activeAcademicYear;
  const activeYear =
    academicYears.find((year) => year.isActive) ?? currentAcademicYear;

  const value = useMemo(
    () => ({
      academicYears,
      activeAcademicYear: activeYear,
      currentAcademicYear,
      setCurrentAcademicYearId,
      transitionAcademicYear: ({
        closingYearId,
        name,
        startDate,
        endDate,
      }: TransitionAcademicYearInput) => {
        const normalizedName = name.trim();
        const now = new Date().toISOString();
        const newYear: AcademicYear = {
          id: `ay-${normalizedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
          name: normalizedName,
          startDate,
          endDate,
          isActive: true,
          isClosed: false,
          createdAt: now,
          updatedAt: now,
        };

        setAcademicYears((years) => {
          const nextYears = years.map((year) => ({
            ...year,
            isActive: false,
            isClosed: year.id === closingYearId ? true : year.isClosed,
            updatedAt: year.id === closingYearId ? now : year.updatedAt,
          }));
          const existingIndex = nextYears.findIndex(
            (year) => year.id === newYear.id,
          );

          if (existingIndex >= 0) {
            nextYears[existingIndex] = {
              ...nextYears[existingIndex],
              ...newYear,
              createdAt: nextYears[existingIndex].createdAt,
            };
            return nextYears;
          }

          return [...nextYears, newYear];
        });
        setCurrentAcademicYearId(newYear.id);
      },
    }),
    [academicYears, activeYear, currentAcademicYear],
  );

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
}

export function useAcademicYear() {
  const value = useContext(AcademicYearContext);
  if (!value) {
    throw new Error("useAcademicYear must be used inside AcademicYearProvider");
  }
  return value;
}
