"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import { saveInfrastructureFacility } from "@/repository/infrastructure";

export default function InfrastructureModuleDesktop() {
  return (
    <ModuleRoutePage
      active="Infrastructure"
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
