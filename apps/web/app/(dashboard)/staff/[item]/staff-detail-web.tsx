"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { deleteStaffMember } from "@/lib/staff";

export default function StaffDetailWeb({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Staff"
      item={item}
      onDeleteStaff={deleteStaffMember}
    />
  );
}
