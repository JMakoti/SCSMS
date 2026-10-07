"use client";

import {
  createContext,
  useEffect,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AcademicYear } from "../types/enterprise";

type TransitionAcademicYearInput = {
  closingYearId: string;
  name: string;
  startDate: string;
  endDate: string;
};

type PersistAcademicYearTransitionInput = {
  closingYear: AcademicYear | null;
  newYear: AcademicYear;
};

type AcademicYearProviderProps = {
  children: ReactNode;
  initialAcademicYears?: AcademicYear[];
  initialCurrentAcademicYearId?: string;
  onSetCurrentAcademicYear?: (id: string) => Promise<void> | void;
  onTransitionAcademicYear?: (
    input: PersistAcademicYearTransitionInput,
  ) => Promise<void> | void;
};

type AcademicYearContextValue = {
  academicYears: AcademicYear[];
  activeAcademicYear: AcademicYear;
  currentAcademicYear: AcademicYear;
  setCurrentAcademicYearId: (id: string) => Promise<void>;
  transitionAcademicYear: (input: TransitionAcademicYearInput) => Promise<void>;
};

const AcademicYearContext = createContext<AcademicYearContextValue | null>(
  null,
);

function createFallbackAcademicYear() {
  const currentYear = String(new Date().getFullYear());
  const now = new Date().toISOString();

  return {
    id: `ay-${currentYear}`,
    name: currentYear,
    startDate: `${currentYear}-01-01`,
    endDate: `${currentYear}-12-31`,
    isActive: true,
    isClosed: false,
    createdAt: now,
    updatedAt: now,
  } satisfies AcademicYear;
}

export function AcademicYearProvider({
  children,
  initialAcademicYears,
  initialCurrentAcademicYearId,
  onSetCurrentAcademicYear,
  onTransitionAcademicYear,
}: AcademicYearProviderProps) {
  const fallbackAcademicYear = useMemo(createFallbackAcademicYear, []);
  const [academicYears, setAcademicYears] =
    useState<AcademicYear[]>(() =>
      initialAcademicYears?.length
        ? initialAcademicYears
        : [fallbackAcademicYear],
    );
  const [currentAcademicYearId, setCurrentAcademicYearId] = useState(
    initialCurrentAcademicYearId ??
      initialAcademicYears?.find((year) => year.isActive)?.id ??
      initialAcademicYears?.[0]?.id ??
      fallbackAcademicYear.id,
  );

  useEffect(() => {
    if (!initialAcademicYears?.length) return;

    setAcademicYears(initialAcademicYears);
    setCurrentAcademicYearId(
      initialCurrentAcademicYearId ??
        initialAcademicYears.find((year) => year.isActive)?.id ??
        initialAcademicYears[0].id,
    );
  }, [initialAcademicYears, initialCurrentAcademicYearId]);

  const currentAcademicYear =
    academicYears.find((year) => year.id === currentAcademicYearId) ??
    academicYears.find((year) => year.isActive) ??
    academicYears[0] ??
    fallbackAcademicYear;
  const activeYear =
    academicYears.find((year) => year.isActive) ?? currentAcademicYear;

  const value = useMemo(
    () => ({
      academicYears,
      activeAcademicYear: activeYear,
      currentAcademicYear,
      setCurrentAcademicYearId: async (id: string) => {
        await onSetCurrentAcademicYear?.(id);
        setCurrentAcademicYearId(id);
      },
      transitionAcademicYear: async ({
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
        const closingYear =
          academicYears.find((year) => year.id === closingYearId) ?? null;

        await onTransitionAcademicYear?.({
          closingYear,
          newYear,
        });

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
    [
      academicYears,
      activeYear,
      currentAcademicYear,
      onSetCurrentAcademicYear,
      onTransitionAcademicYear,
    ],
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
