"use client";

import { useRouter } from "next/navigation";
import type { WardDetailRecord } from "../data/feature-data-context";
import { RecordDetail } from "../pages/record-detail";
import { routeForModule } from "../navigation/route-for-module";
import type { EnrollmentGradeSaveInput } from "../schemas/enrollment-grade-schema";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

export function RecordDetailRoutePage({
  active,
  item,
  wardId,
  wardDetail,
  wardCode,
  onDeleteWard,
  onSaveEnrollmentGrade,
  onSaveInfrastructureFacility,
}: {
  active: string;
  item: string;
  wardId?: string;
  wardDetail?: WardDetailRecord;
  wardCode?: string;
  onDeleteWard?: () => Promise<void>;
  onSaveEnrollmentGrade?: (input: EnrollmentGradeSaveInput) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
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
    />
  );
}

export default RecordDetailRoutePage;
