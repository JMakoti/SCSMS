"use client";

import ModuleRoutePage from "@scsms/features/pages/module-route-page";
import { createStaffMember, deleteStaffMember } from "@/repository/staff";

export default function StaffPage() {
  return (
    <ModuleRoutePage
      active="Staff"
      onCreateStaff={createStaffMember}
      onDeleteStaff={deleteStaffMember}
    />
  );
}
