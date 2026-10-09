"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import {
  createInfrastructureProject,
  deleteInfrastructureProject,
  saveInfrastructureFacility,
  updateInfrastructureProject,
} from "@/lib/infrastructure";

export default function InfrastructureModuleWeb() {
  return (
    <ModuleRoutePage
      active="Infrastructure"
      onSaveInfrastructureFacility={saveInfrastructureFacility}
      onCreateInfrastructureProject={createInfrastructureProject}
      onUpdateInfrastructureProject={updateInfrastructureProject}
      onDeleteInfrastructureProject={deleteInfrastructureProject}
    />
  );
}
