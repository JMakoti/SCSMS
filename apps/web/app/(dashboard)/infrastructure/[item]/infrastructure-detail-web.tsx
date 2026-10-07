"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { saveInfrastructureFacility } from "@/lib/infrastructure";

export default function InfrastructureDetailWeb({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Infrastructure"
      item={item}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
