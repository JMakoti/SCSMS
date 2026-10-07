"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { saveInfrastructureFacility } from "@/repository/infrastructure";

export default function InfrastructureDetailDesktop({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Infrastructure"
      item={item}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
    />
  );
}
