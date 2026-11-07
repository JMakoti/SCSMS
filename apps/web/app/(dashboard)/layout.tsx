import type { ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { ExaminationProvider } from "../../components/examination-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ExaminationProvider><DashboardShell>{children}</DashboardShell></ExaminationProvider>;
}
