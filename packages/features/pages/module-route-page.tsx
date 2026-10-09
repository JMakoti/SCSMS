"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GenericPage } from "../pages/generic-page";
import { routeForModule } from "../navigation/route-for-module";
import { RecordDetail } from "./record-detail";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import type {
  AddContactFormValues,
  AddStaffFormValues,
  InfrastructureProjectFormValues,
} from "../types/forms";

type InfrastructureProjectActions = {
  onCreateInfrastructureProject?: (
    input: InfrastructureProjectFormValues,
  ) => Promise<string | void>;
  onUpdateInfrastructureProject?: (
    projectId: string,
    input: InfrastructureProjectFormValues,
  ) => Promise<void>;
  onDeleteInfrastructureProject?: (projectId: string) => Promise<void>;
};
type ContactActions = {
  onCreateContact?: (values: AddContactFormValues) => Promise<void>;
  onUpdateContact?: (
    contactId: string,
    values: Partial<AddContactFormValues>,
  ) => Promise<void>;
  onDeleteContact?: (contactId: string) => Promise<void>;
};

export function ModuleRoutePage({
  active,
  onSaveInfrastructureFacility,
  onCreateInfrastructureProject,
  onUpdateInfrastructureProject,
  onDeleteInfrastructureProject,
  onCreateStaff,
  onDeleteStaff,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
}: {
  active: string;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
  onCreateStaff?: (values: AddStaffFormValues) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
} & InfrastructureProjectActions &
  ContactActions) {
  return (
    <Suspense fallback={null}>
      <ModuleRoutePageContent
        active={active}
        onSaveInfrastructureFacility={onSaveInfrastructureFacility}
        onCreateInfrastructureProject={onCreateInfrastructureProject}
        onUpdateInfrastructureProject={onUpdateInfrastructureProject}
        onDeleteInfrastructureProject={onDeleteInfrastructureProject}
        onCreateStaff={onCreateStaff}
        onDeleteStaff={onDeleteStaff}
        onCreateContact={onCreateContact}
        onUpdateContact={onUpdateContact}
        onDeleteContact={onDeleteContact}
      />
    </Suspense>
  );
}

function ModuleRoutePageContent({
  active,
  onSaveInfrastructureFacility,
  onCreateInfrastructureProject,
  onUpdateInfrastructureProject,
  onDeleteInfrastructureProject,
  onCreateStaff,
  onDeleteStaff,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
}: {
  active: string;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
  onCreateStaff?: (values: AddStaffFormValues) => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
} & InfrastructureProjectActions &
  ContactActions) {
  const router = useRouter();
  const item = useSearchParams().get("item");

  if (item) {
    return (
      <RecordDetail
        active={active}
        item={item}
        onBack={() => router.push(routeForModule(active))}
        onSaveInfrastructureFacility={onSaveInfrastructureFacility}
        onCreateInfrastructureProject={onCreateInfrastructureProject}
        onUpdateInfrastructureProject={onUpdateInfrastructureProject}
        onDeleteInfrastructureProject={onDeleteInfrastructureProject}
        onDeleteStaff={onDeleteStaff}
        onCreateContact={onCreateContact}
        onUpdateContact={onUpdateContact}
        onDeleteContact={onDeleteContact}
      />
    );
  }

  return (
    <GenericPage
      active={active}
      setActive={() => undefined}
      onDetail={(selectedItem) =>
        router.push(
          `${routeForModule(active)}?item=${encodeURIComponent(selectedItem)}`,
        )
      }
      onSaveStaff={onCreateStaff}
    />
  );
}

export default ModuleRoutePage;
