"use client";

import { useRouter } from "next/navigation";
import Dashboard from "@scsms/features/pages/dashboard-page";
import { routeForModule } from "@scsms/features/navigation/route-for-module";

export default function DashboardPage() {
  const router = useRouter();

  return (
    <Dashboard
      setActive={(moduleName) => router.push(routeForModule(moduleName))}
    />
  );
}
