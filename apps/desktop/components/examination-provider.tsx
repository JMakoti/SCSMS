"use client";
import type { ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { ExaminationContext, type ExaminationAdapter } from "@scsms/features/examinations/context";
import { examinationSaveSchema, examinationFiltersSchema, type ExaminationAccess } from "@scsms/features/examinations/model";
import { loadExamination, type Query } from "@scsms/features/examinations/service";

const query: Query = async <T extends object>(statement: string, params: (string | number | null)[] = []) => {
  const result = await invoke<{ rows: T[] }>("run_sql", { sql: statement, params, method: "objects" });
  return result.rows;
};
const adapter: ExaminationAdapter = {
  load: async (filters) => {
    const access = await invoke<ExaminationAccess>("examination_access", { schoolId: filters.schoolId });
    return loadExamination(query, examinationFiltersSchema.parse(filters), access);
  },
  save: async (input) => {
    await invoke("save_school_examination", { input: examinationSaveSchema.parse(input) });
    window.dispatchEvent(new Event("scsms:feature-data-refresh"));
  },
};
export function ExaminationProvider({ children }: { children: ReactNode }) {
  return <ExaminationContext.Provider value={adapter}>{children}</ExaminationContext.Provider>;
}
