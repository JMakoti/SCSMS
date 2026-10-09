"use client";

import SchoolProfileRoutePage from "@scsms/features/pages/school-profile-route-page";
import { deleteSchool } from "@/repository/school";
import { saveEnrollmentGrade } from "@/repository/enrollment";
import {
  createInfrastructureProject,
  deleteInfrastructureProject,
  saveInfrastructureFacility,
  updateInfrastructureProject,
} from "@/repository/infrastructure";
import { createContact, deleteContact, updateContact } from "@/repository/contact";
import {
  createSubjectCombination,
  deleteSubjectCombination,
  updateSubjectCombination,
} from "@/repository/subject-combinations";
import { resolveSchoolLogo } from "@/lib/resolve-school-logo";

export function SchoolProfileDesktop({ schoolId }: { schoolId: string }) {
  return (
    <SchoolProfileRoutePage
      schoolId={schoolId}
      onDeleteSchool={deleteSchool}
      resolveLogo={resolveSchoolLogo}
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
