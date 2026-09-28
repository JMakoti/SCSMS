"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SchoolsPage from "../pages/schools-page";
import { AddSchoolDialog } from "../dialogs/school-dialogs";

export function SchoolsRoutePage() {
  const [showAddSchool, setShowAddSchool] = useState(false);
  const router = useRouter();

  return (
    <>
      <SchoolsPage
        onAdd={() => setShowAddSchool(true)}
        onProfile={(schoolId) =>
          router.push(`/schools/${encodeURIComponent(schoolId)}`)
        }
      />
      {showAddSchool && (
        <AddSchoolDialog onClose={() => setShowAddSchool(false)} />
      )}
    </>
  );
}

export default SchoolsRoutePage;
