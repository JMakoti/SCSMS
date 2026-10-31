import type { ReactNode } from "react";
import { DashboardShell } from "./dashboard-shell";
import { DesktopUpdaterProvider } from "@/components/desktop-updater-provider";
import { DesktopSyncProvider } from "@/components/desktop-sync-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <DesktopSyncProvider><DesktopUpdaterProvider><DashboardShell>{children}</DashboardShell></DesktopUpdaterProvider></DesktopSyncProvider>;
}
