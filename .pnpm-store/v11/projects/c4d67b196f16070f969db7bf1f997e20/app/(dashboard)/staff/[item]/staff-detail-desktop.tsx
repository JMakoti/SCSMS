"use client";

import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { deleteStaffMember } from "@/repository/staff";

export default function StaffDetailDesktop({ item }: { item: string }) {
  return (
    <RecordDetailRoutePage
      active="Staff"
      item={item}
      onDeleteStaff={deleteStaffMember}
    />
  );
}
