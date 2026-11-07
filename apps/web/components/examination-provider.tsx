"use client";
import type { ReactNode } from "react";
import { ExaminationContext, type ExaminationAdapter } from "@scsms/features/examinations/context";
async function response<T>(request: Promise<Response>): Promise<T> {
  const result = await request;
  const body = await result.json();
  if (!result.ok) throw new Error(body.error ?? "Examination request failed.");
  return body as T;
}
const adapter: ExaminationAdapter = {
  load: (filters) => response(fetch(`/api/examinations?${new URLSearchParams(Object.entries(filters).filter(([, value]) => value !== undefined).map(([key, value]) => [key, String(value)]))}`, { cache: "no-store" })),
  save: async (input) => { await response(fetch("/api/examinations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(input) })); window.dispatchEvent(new Event("scsms:feature-data-refresh")); },
};
export function ExaminationProvider({ children }: { children: ReactNode }) {
  return <ExaminationContext.Provider value={adapter}>{children}</ExaminationContext.Provider>;
}
