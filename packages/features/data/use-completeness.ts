"use client";

import { useMemo } from "react";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { useFeatureData } from "./feature-data-context";
import { completenessReport } from "./completeness";

export function useCompleteness() {
  const data = useFeatureData();
  const { currentAcademicYear } = useAcademicYear();
  return useMemo(() => completenessReport(data, currentAcademicYear.id), [data, currentAcademicYear.id]);
}
