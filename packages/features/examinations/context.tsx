"use client";
import { createContext, useContext } from "react";
import type { ExaminationDashboard, ExaminationFilters, ExaminationSaveInput } from "./model";
export type ExaminationAdapter = {
  load: (filters: ExaminationFilters) => Promise<ExaminationDashboard>;
  save: (input: ExaminationSaveInput) => Promise<void>;
};
export const ExaminationContext = createContext<ExaminationAdapter | null>(null);
export function useExaminationAdapter() { return useContext(ExaminationContext); }
