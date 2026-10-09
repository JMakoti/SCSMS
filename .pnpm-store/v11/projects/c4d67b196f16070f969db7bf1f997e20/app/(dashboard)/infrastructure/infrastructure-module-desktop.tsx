"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import {
  createInfrastructureProject,
  deleteInfrastructureProject,
  saveInfrastructureFacility,
  updateInfrastructureProject,
} from "@/repository/infrastructure";

export default function InfrastructureModuleDesktop() {
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
