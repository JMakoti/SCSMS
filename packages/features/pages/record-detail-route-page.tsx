"use client";

import { useRouter } from "next/navigation";
import type { WardDetailRecord } from "../data/feature-data-context";
import { RecordDetail } from "../pages/record-detail";
import { routeForModule } from "../navigation/route-for-module";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import type {
  AddContactFormValues,
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

export function RecordDetailRoutePage({
  active,
  item,
  wardId,
  wardDetail,
  wardCode,
  onDeleteWard,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
  onCreateInfrastructureProject,
  onUpdateInfrastructureProject,
  onDeleteInfrastructureProject,
  onDeleteStaff,
  onCreateContact,
  onUpdateContact,
  onDeleteContact,
}: {
  active: string;
  item: string;
  wardId?: string;
  wardDetail?: WardDetailRecord;
  wardCode?: string;
  onDeleteWard?: () => Promise<void>;
  onDeleteStaff?: (staffId: string) => Promise<void>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
} & InfrastructureProjectActions &
  ContactActions) {
  const router = useRouter();

  return (
    <RecordDetail
      active={active}
      item={item}
      wardId={wardId}
      wardDetail={wardDetail}
      onBack={() => router.push(routeForModule(active))}
      wardCode={wardCode}
      onDeleteWard={onDeleteWard}
      onSaveEnrollmentGrade={onSaveEnrollmentGrade}
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

export default RecordDetailRoutePage;
