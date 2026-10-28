"use client";

import SchoolsRoutePage from "@scsms/features/pages/schools-route-page";
import { chooseSchoolLogoFile } from "@/lib/choose-school-logo-file";
import { resolveSchoolLogo } from "@/lib/resolve-school-logo";
import { createSchool, deleteSchool } from "@/repository/school";
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

export default function SchoolsPage() {
  return (
    <SchoolsRoutePage
      onSaveSchool={createSchool}
      onChooseFile={chooseSchoolLogoFile}
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
