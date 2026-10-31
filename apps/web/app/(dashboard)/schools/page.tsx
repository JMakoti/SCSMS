"use client";

import SchoolsRoutePage from "@scsms/features/pages/schools-route-page";
import { saveEnrollmentGrade } from "@/lib/enrollment";
import { createSchool } from "@/lib/school";
import { chooseSchoolLogoFile, resolveSchoolLogo } from "@/lib/school-logo";
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

export default function SchoolsPage() {
  return (
    <SchoolsRoutePage
      onSaveSchool={createSchool}
      onChooseFile={chooseSchoolLogoFile}
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
