"use client";

import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";
import { saveEnrollmentGrade } from "@/lib/enrollment";
import {
  createInfrastructureProject,
  deleteInfrastructureProject,
  saveInfrastructureFacility,
  updateInfrastructureProject,
} from "@/lib/infrastructure";
import { createContact, deleteContact, updateContact } from "@/lib/contact";
import {
  createSubjectCombination,
  deleteSubjectCombination,
  updateSubjectCombination,
} from "@/lib/subject-combinations";

export default function SchoolProfileWeb({ schoolId }: { schoolId: string }) {
  return (
    <SchoolProfileRoutePage
      schoolId={schoolId}
      onSaveEnrollmentGrade={saveEnrollmentGrade}
      onSaveInfrastructureFacility={saveInfrastructureFacility}
      onCreateInfrastructureProject={createInfrastructureProject}
      onUpdateInfrastructureProject={updateInfrastructureProject}
      onDeleteInfrastructureProject={deleteInfrastructureProject}
      onCreateContact={createContact}
      onUpdateContact={updateContact}
      onDeleteContact={deleteContact}
      onCreateSubjectCombination={createSubjectCombination}
      onUpdateSubjectCombination={updateSubjectCombination}
      onDeleteSubjectCombination={deleteSubjectCombination}
    />
  );
}
