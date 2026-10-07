"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import { saveInfrastructureFacility } from "@/lib/infrastructure";

export default function InfrastructureModuleWeb() {
  return (
    <ModuleRoutePage
      active="Infrastructure"
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
