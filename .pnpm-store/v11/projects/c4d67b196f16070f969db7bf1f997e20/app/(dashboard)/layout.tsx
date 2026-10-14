import type { ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { DesktopUpdaterProvider } from "@/components/desktop-updater-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DesktopUpdaterProvider><DashboardShell>{children}</DashboardShell></DesktopUpdaterProvider>;
}
