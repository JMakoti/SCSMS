"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { editRecordSchema } from "../schemas/edit-record-schema";
import { editSchoolRecordSchema } from "../schemas/edit-school-record-schema";
import { editWardRecordSchema } from "../schemas/edit-ward-record-schema";
import type {
  EditRecordFormValues,
  EditSchoolRecordFormValues,
  EditWardRecordFormValues,
} from "../types/forms";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";
import { useFeatureData } from "../data/feature-data-context";
import { useAcademicYear } from "../academic-years/academic-year-context";
import {
  getSchoolClassification,
  getSchoolLevel,
  getSchoolOwnership,
  getSchoolRegistrationStatus,
  getSchoolTitleDeed,
  schoolBoardingOptions,
  schoolClassificationOptions,
  schoolGenderOptions,
  schoolLevelOptions,
  schoolOwnershipOptions,
  schoolRegistrationStatusOptions,
  schoolTitleDeedOptions,
} from "../schools/school-display";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";

type EditField = {
  label: string;
  name: string;
  kind?: "input" | "select" | "textarea";
  inputType?: "text" | "number";
  showsPercentage?: boolean;
};

function calculatePercentage(
  value: string | undefined,
  total: string | undefined,
) {
  const count = Number(value) || 0;
  const totalCount = Number(total) || 0;
  if (!totalCount) return "0%";
  return `${Math.round((count / totalCount) * 100)}%`;
}

export function EditRecordDialog({
  active,
  item,
  schoolId,
  wardId,
  onClose,
  onSaveSchool,
  onSaveWard,
  onSaveStaff,
  onSaveInfrastructureFacility,
  onChooseFile,
  wardCode,
}: {
  active: string;
  item: string;
  schoolId?: string;
  wardId?: string;
  onClose: () => void;
  onSaveSchool?: (
    schoolId: string,
    values: EditSchoolRecordFormValues,
  ) => Promise<void>;
  onSaveWard?: (values: EditWardRecordFormValues) => Promise<void>;
  onSaveStaff?: (staffId: string, values: EditRecordFormValues) => Promise<void>;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
  onChooseFile?: () => Promise<string | null>;
  wardCode?: string;
}) {
  const {
    schools,
    staff: staffRecords,
    wards,
    wardOptions,
    subCounties,
    enrollmentRows,
    infrastructureFacilities,
    performanceRecords,
    performanceSubjects,
    terms,
  } = useFeatureData();
  const { currentAcademicYear } = useAcademicYear();
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const wardRecord = active === "Ward"
    ? wards.find((ward) => ward.id === wardId) ??
      wards.find((ward) => ward.name === item || ward.wardCode === wardCode)
    : null;
  const wardInfo = wardRecord
    ? {
        wardName: wardRecord.name,
        wardCode: wardRecord.wardCode,
        subCountyId: wardRecord.subCountyId,
      }
    : null;
  const schoolInfo =
    active === "Schools" ||
    active === "Infrastructure" ||
    active === "School Performance"
      ? (schools.find(
        (school) =>
          school.id === schoolId ||
          school.displayName === item ||
          school.officialName === item ||
          school.schoolCode === item,
      ) ?? null)
      : null;
  const [selectedLogoPath, setSelectedLogoPath] = useState(
    schoolInfo?.logoPath ?? "",
  );
  const staffInfo =
    active === "Staff"
      ? staffRecords.find((record) => record.name === item)
      : null;
  const enrollmentRow = enrollmentRows.find(
    (row) =>
      row.schoolId === schoolInfo?.id &&
      row.academicYearId === currentAcademicYear.id,
  );
  const infrastructureRows = infrastructureFacilities.filter(
    (row) =>
      row.schoolId === schoolInfo?.id &&
      row.academicYearId === currentAcademicYear.id,
  );
  const infrastructureRowByName = (name: string) =>
    infrastructureRows.find((row) =>
      row.facility.toLowerCase().includes(name.toLowerCase()),
    );
  const classroomInfrastructure = infrastructureRowByName("classroom");
  const electricityInfrastructure =
    infrastructureRowByName("electricity") ??
    infrastructureRowByName("power");
  const waterInfrastructure =
    infrastructureRowByName("water") ??
    infrastructureRowByName("borehole");
  const latestPerformance = performanceRecords
    .filter((record) => record.schoolId === schoolInfo?.id)
    .sort((a, b) => b.year.localeCompare(a.year))[0];
  const subjectResults = latestPerformance
    ? performanceSubjects.filter(
        (subject) =>
          subject.performanceRecordId === latestPerformance.id &&
          subject.averageScore !== null,
      )
    : [];
  const bestSubject = [...subjectResults].sort(
    (a, b) => (b.averageScore ?? 0) - (a.averageScore ?? 0),
  )[0];
  const fields: EditField[] =
    active === "Schools"
      ? [
        { label: "School code", name: "schoolCode" },
        { label: "UIC code", name: "uicCode" },
        { label: "KNEC code", name: "knecCode" },
        { label: "TSC code", name: "tscCode" },
        { label: "School logo file", name: "filePath" },
        { label: "Registration number", name: "regNumber" },
        { label: "Official school name", name: "officialName" },
        { label: "Display name", name: "displayName" },
        { label: "Institution type", name: "institutionType" },
        { label: "Source institution type", name: "sourceInstitutionType" },
        { label: "Registration status", name: "registrationStatus" },
        { label: "Level", name: "level" },
        { label: "Ownership", name: "ownershipType" },
        { label: "Gender", name: "genderType" },
        { label: "Boarding", name: "boardingType" },
        { label: "Title deed", name: "titleDeed" },
        { label: "County", name: "county" },
        { label: "Sub-County", name: "subCounty" },
        { label: "Ward", name: "ward" },
        { label: "Location", name: "location" },
        { label: "Address", name: "address" },
        { label: "Phone", name: "phone" },
        { label: "Email", name: "email" },
        { label: "Latitude", name: "latitude" },
        { label: "Longitude", name: "longitude" },
        { label: "SNE", name: "sne" },
        { label: "Status", name: "isActive" },
        { label: "Data confidence", name: "dataConfidence" },
      ]
      : active === "Staff"
        ? [
          "Full name",
          "Designation",
          "Assigned school",
          "Employment type",
          "Employer",
          "TSC No.",
          "Email address",
          "Phone number",
          "Date joined",
        ].map((label) => ({ label, name: label }))
        : active === "Enrollment"
          ? [
            "School",
            "Academic year",
            "Term",
            "Grade",
            "Male learners",
            "Female learners",
          ].map((label) => ({ label, name: label }))
          : active === "Infrastructure"
            ? [
              "School",
              "Classrooms",
              "Good condition",
              "Needs repair",
              "Electricity",
              "Water",
            ].map((label) => ({ label, name: label }))
            : active === "School Contacts"
              ? ["School", "Contact name", "Role", "Phone", "Email"].map(
                (label) => ({ label, name: label }),
              )
              : active === "School Performance"
                ? [
                  { label: "School", name: "school" },
                  { label: "Assessment", name: "assessment", kind: "select" },
                  { label: "Academic year", name: "academicYear" },
                  { label: "Level", name: "level", kind: "select" },
                  { label: "KNEC code", name: "knecCode" },
                  {
                    label: "Candidates",
                    name: "candidates",
                    inputType: "number",
                  },
                  {
                    label: "Mean score",
                    name: "meanScore",
                    inputType: "number",
                  },
                  {
                    label: "Subjects",
                    name: "subjects",
                    inputType: "number",
                  },
                  { label: "Best subject", name: "bestSubject" },
                  {
                    label: "Exceeding expectation",
                    name: "exceedingCount",
                    inputType: "number",
                    showsPercentage: true,
                  },
                  {
                    label: "Meeting expectation",
                    name: "meetingCount",
                    inputType: "number",
                    showsPercentage: true,
                  },
                  {
                    label: "Approaching expectation",
                    name: "approachingCount",
                    inputType: "number",
                    showsPercentage: true,
                  },
                  {
                    label: "Below expectation",
                    name: "belowCount",
                    inputType: "number",
                    showsPercentage: true,
                  },
                  { label: "Notes", name: "notes", kind: "textarea" },
                ]
                : active === "Ward"
                  ? [
                    { label: "Ward name", name: "wardName" },
                    { label: "Ward code", name: "wardCode" },
                    { label: "Sub-County", name: "subCountyId", kind: "select" },
                  ]
                  : ["Report type", "Reporting period", "Description"].map(
                    (label) => ({ label, name: label }),
                  );

  const getDefaultValue = (field: EditField) => {
    if (active === "Schools" && schoolInfo) {
      const values: Record<string, string> = {
        schoolCode: schoolInfo.schoolCode ?? "",
        uicCode: schoolInfo.uicCode ?? "",
        knecCode: schoolInfo.knecCode ?? "",
        tscCode: schoolInfo.tscCode ?? "",
        filePath: schoolInfo.logoPath ?? "",
        regNumber: schoolInfo.registrationNumber ?? "",
        officialName: schoolInfo.officialName,
        displayName: schoolInfo.displayName,
        institutionType: getSchoolClassification(schoolInfo),
        sourceInstitutionType: schoolInfo.sourceInstitutionType ?? "",
        registrationStatus: getSchoolRegistrationStatus(schoolInfo),
        level: getSchoolLevel(schoolInfo),
        ownershipType: getSchoolOwnership(schoolInfo),
        genderType: schoolInfo.genderType,
        boardingType: schoolInfo.boardingType,
        titleDeed: getSchoolTitleDeed(schoolInfo),
        county: schoolInfo.county ?? "",
        subCounty: schoolInfo.subCounty ?? "",
        ward: schoolInfo.wardId ?? "",
        location: schoolInfo.location ?? "",
        address: schoolInfo.address ?? "",
        phone: schoolInfo.phone ?? "",
        email: schoolInfo.email ?? "",
        latitude: String(schoolInfo.latitude ?? ""),
        longitude: String(schoolInfo.longitude ?? ""),
        sne: schoolInfo.sne,
        isActive: schoolInfo.isActive ? "Active" : "Inactive",
        dataConfidence: schoolInfo.dataConfidence ?? "",
      };

      return values[field.name] ?? "";
    }

    if (active === "Ward") {
      const values: Record<string, string> = {
        wardName: wardInfo?.wardName ?? item,
        wardCode: wardInfo?.wardCode ?? wardCode ?? "",
        subCountyId: wardInfo?.subCountyId ?? "",
      };

      return values[field.name] ?? "";
    }

    if (active === "Staff") {
      const values: Record<string, string> = {
        "Full name": staffInfo?.name ?? item,
        Designation: staffInfo?.role ?? "",
        "Assigned school": staffInfo?.assignedSchool ?? "",
        "Employment type": staffInfo?.employmentType ?? "",
        Employer: staffInfo?.employer ?? "",
        "TSC No.": staffInfo?.tscNo ?? "",
        "Email address": staffInfo?.email ?? "",
        "Phone number": staffInfo?.phone ?? "",
        "Date joined": staffInfo?.dateJoined ?? "",
      };

      return values[field.label] ?? "";
    }

    if (active === "School Performance") {
      const values: Record<string, string> = {
        school: item,
        assessment: latestPerformance?.assessmentName ?? "",
        academicYear: latestPerformance?.year ?? currentAcademicYear.name,
        level: schoolInfo ? getSchoolLevel(schoolInfo) : "",
        knecCode: schoolInfo?.knecCode ?? "",
        candidates: String(latestPerformance?.candidates ?? ""),
        meanScore: String(latestPerformance?.averageScore ?? ""),
        subjects: String(subjectResults.length),
        bestSubject: bestSubject?.subject ?? "",
        exceedingCount: "",
        meetingCount: "",
        approachingCount: "",
        belowCount: "",
        notes: "",
      };

      return values[field.name] ?? "";
    }

    if (active === "Infrastructure") {
      const values: Record<string, string> = {
        School: item,
        Classrooms: String(classroomInfrastructure?.available ?? ""),
        "Good condition": String(classroomInfrastructure?.good ?? ""),
        "Needs repair": String(classroomInfrastructure?.needsRepair ?? ""),
        Electricity: electricityInfrastructure?.status ?? "",
        Water: waterInfrastructure?.status ?? "",
      };

      return values[field.name] ?? "";
    }

    return field.label === "School" || field.label === "Assigned school"
      ? item
      : field.label === "Full name"
        ? item
        : field.label === "Academic year"
        ? currentAcademicYear.name
        : field.label === "Male learners"
          ? String(enrollmentRow?.male ?? "")
          : field.label === "Female learners"
            ? String(enrollmentRow?.female ?? "")
            : field.label === "Grade"
              ? enrollmentRow?.grade ?? ""
              : field.label === "Term"
                ? terms.find((term) => term.id === enrollmentRow?.termId)?.name ?? ""
                : field.label === "Employment type"
                  ? staffInfo?.employmentType ?? ""
                : field.label === "Status"
                  ? staffInfo?.status ?? ""
                    : field.label === "Ward"
                      ? item
                      : "";
  };

  const { register, handleSubmit, watch } = useForm<
    EditRecordFormValues | EditSchoolRecordFormValues | EditWardRecordFormValues
  >({
    resolver: zodResolver(
      active === "Schools"
        ? editSchoolRecordSchema
        : active === "Ward"
          ? editWardRecordSchema
          : editRecordSchema,
    ),
    defaultValues: {
      fields: Object.fromEntries(
        fields.map((field) => [field.name, getDefaultValue(field)]),
      ),
    },
  });
  const watchedFields = watch("fields") as Record<string, string | undefined>;
  const parseNonNegativeInteger = (
    value: string | undefined,
    label: string,
  ) => {
    const parsed = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
    if (!Number.isInteger(parsed) || parsed < 0) {
      throw new Error(`${label} must be a non-negative whole number.`);
    }

    return parsed;
  };
  const normalizeFacilityStatus = (
    value: string | undefined,
  ): InfrastructureFacilitySaveInput["status"] => {
    const normalized = String(value ?? "").trim().toLowerCase();
    if (!normalized) return "Pending";
    if (normalized.includes("unavailable") || normalized === "no") {
      return "Unavailable";
    }
    if (normalized.includes("repair") || normalized.includes("poor")) {
      return "Needs repair";
    }
    if (normalized.includes("complete")) return "Completed";
    if (normalized.includes("pending")) return "Pending";

    return "Active";
  };
  const saveRecord = async (
    values:
      | EditRecordFormValues
      | EditSchoolRecordFormValues
      | EditWardRecordFormValues,
  ) => {
    setSaveError("");
    setSaving(true);
    try {
      if (active === "Ward") {
        if (!onSaveWard) {
          throw new Error("Ward changes cannot be saved because no database handler is available.");
        }
        await onSaveWard(values as EditWardRecordFormValues);
        window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      } else if (active === "Schools") {
        if (!onSaveSchool || !schoolInfo) {
          throw new Error("School changes cannot be saved because the school database handler is unavailable.");
        }
        await onSaveSchool(
          schoolInfo.id,
          {
            ...(values as EditSchoolRecordFormValues),
            fields: {
              ...(values as EditSchoolRecordFormValues).fields,
              filePath: selectedLogoPath,
            },
          },
        );
        window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      } else if (active === "Staff") {
        if (!onSaveStaff || !staffInfo?.id) {
          throw new Error(
            "Staff changes cannot be saved because the staff database handler is unavailable.",
          );
        }
        await onSaveStaff(staffInfo.id, values as EditRecordFormValues);
        window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      } else if (active === "Infrastructure") {
        if (!onSaveInfrastructureFacility || !schoolInfo) {
          throw new Error(
            "Infrastructure changes cannot be saved because the database handler is unavailable.",
          );
        }
        const formFields = (values as EditRecordFormValues).fields;
        const classroomAvailable = parseNonNegativeInteger(
          formFields.Classrooms,
          "Classrooms",
        );
        const classroomGood = parseNonNegativeInteger(
          formFields["Good condition"],
          "Good condition",
        );
        const classroomNeedsRepair = parseNonNegativeInteger(
          formFields["Needs repair"],
          "Needs repair",
        );

        await onSaveInfrastructureFacility({
          schoolId: schoolInfo.id,
          academicYearId: currentAcademicYear.id,
          previousFacility: classroomInfrastructure?.facility ?? "Classrooms",
          facility: classroomInfrastructure?.facility ?? "Classrooms",
          available: classroomAvailable,
          good: classroomGood,
          needsRepair: classroomNeedsRepair,
          status: classroomNeedsRepair > 0 ? "Needs repair" : "Active",
        });
        await onSaveInfrastructureFacility({
          schoolId: schoolInfo.id,
          academicYearId: currentAcademicYear.id,
          previousFacility:
            electricityInfrastructure?.facility ?? "Electricity connection",
          facility:
            electricityInfrastructure?.facility ?? "Electricity connection",
          available: electricityInfrastructure?.available ?? 1,
          good: electricityInfrastructure?.good ?? 1,
          needsRepair: electricityInfrastructure?.needsRepair ?? 0,
          status: normalizeFacilityStatus(formFields.Electricity),
        });
        await onSaveInfrastructureFacility({
          schoolId: schoolInfo.id,
          academicYearId: currentAcademicYear.id,
          previousFacility: waterInfrastructure?.facility ?? "Water points",
          facility: waterInfrastructure?.facility ?? "Water points",
          available: waterInfrastructure?.available ?? 1,
          good: waterInfrastructure?.good ?? 1,
          needsRepair: waterInfrastructure?.needsRepair ?? 0,
          status: normalizeFacilityStatus(formFields.Water),
        });
        window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      }
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save the record.",
      );
    } finally {
      setSaving(false);
    }
  };
  const schoolSelectOptions: Record<
    string,
    { label: string; value: string }[]
  > = {
    institutionType: [...schoolClassificationOptions],
    registrationStatus: [...schoolRegistrationStatusOptions],
    level: [...schoolLevelOptions],
    ownershipType: [...schoolOwnershipOptions],
    genderType: [...schoolGenderOptions],
    boardingType: [...schoolBoardingOptions],
    titleDeed: [...schoolTitleDeedOptions],
    county: [{ label: "Kilifi", value: "Kilifi" }],
    subCounty: [{ label: "Rabai", value: "Rabai" }],
    ward: [
      { label: "Select a ward", value: "" },
      ...wardOptions
        .filter(
          (ward) => ward.isActive || ward.id === schoolInfo?.wardId,
        )
        .map((ward) => ({
          label: `${ward.name}${ward.subCounty ? ` - ${ward.subCounty}` : ""}`,
          value: ward.id,
        })),
    ],
    sne: [
      { label: "No", value: "NO" },
      { label: "Yes", value: "YES" },
      { label: "Unknown", value: "UNKNOWN" },
    ],
    isActive: [
      { label: "Active", value: "Active" },
      { label: "Inactive", value: "Inactive" },
    ],
    dataConfidence: [
      { label: "Verified", value: "VERIFIED" },
      { label: "Partial", value: "PARTIAL" },
      { label: "Secondary source", value: "SECONDARY_SOURCE" },
    ],
  };
  const performanceSelectOptions: Record<
    string,
    { label: string; value: string }[]
  > = {
    assessment: [
      { label: "KPSEA", value: "KPSEA" },
      { label: "KJSEA", value: "KJSEA" },
      { label: "KCSE", value: "KCSE" },
    ],
    level: [
      { label: "Primary", value: "Primary" },
      { label: "Junior Secondary", value: "Junior Secondary" },
      { label: "Senior School", value: "Senior School" },
    ],
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">{active} management</span>
            <h2>Edit {active === "Reports" ? "report" : "record"}</h2>
            <p>
              Update the official record and save it to the local sync queue.
            </p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close edit form"
          >
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>{onSaveSchool || onSaveWard ? "Changes saved" : "Changes saved locally"}</h3>
            <p>
              {onSaveSchool
                ? "The updated school record has been saved to the database."
                : onSaveWard
                  ? "The updated ward record has been saved to the database."
                  : "The updated record is queued for synchronization."}
            </p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(saveRecord)}>
            <div className="form-section">
              <h3>Record information</h3>
              <div className="form-grid">
                {fields.map((field) => (
                  <label key={field.name}>
                    {field.label}
                    {active === "Schools" && field.name === "filePath" ? (
                      <div className="school-file-picker">
                        <input
                          value={selectedLogoPath}
                          readOnly
                          placeholder="No file selected"
                        />
                        <button
                          className="outline-button"
                          type="button"
                          onClick={async () => {
                            if (!onChooseFile) return;
                            setSaveError("");
                            try {
                              const filePath = await onChooseFile();
                              if (filePath) {
                                setSelectedLogoPath(filePath);
                              }
                            } catch (error) {
                              setSaveError(
                                error instanceof Error
                                  ? error.message
                                  : "Unable to select the file.",
                              );
                            }
                          }}
                        >
                          Choose file
                        </button>
                      </div>
                    ) : active === "Schools" && schoolSelectOptions[field.name] ? (
                      <select {...register(`fields.${field.name}`)}>
                        {schoolSelectOptions[field.name].map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : active === "School Performance" &&
                      performanceSelectOptions[field.name] ? (
                      <select {...register(`fields.${field.name}`)}>
                        {performanceSelectOptions[field.name].map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    ) : active === "Ward" &&
                      field.name === "subCountyId" ? (
                      <select {...register("fields.subCountyId")}>
                        <option value="">Select a sub-county</option>
                        {subCounties
                          .filter(
                            (subCounty) =>
                              subCounty.isActive ||
                              subCounty.id === wardInfo?.subCountyId,
                          )
                          .map((subCounty) => (
                            <option key={subCounty.id} value={subCounty.id}>
                              {subCounty.subCounty ?? "Unnamed sub-county"}
                            </option>
                          ))}
                      </select>
                    ) : field.kind === "textarea" ? (
                      <textarea
                        {...register(`fields.${field.name}`)}
                        placeholder={`Enter ${field.label.toLowerCase()}`}
                      />
                    ) : field.label === "Term" ||
                      field.label === "Employment type" ||
                      field.label === "Employer" ||
                      field.label === "Status" ? (
                      <select {...register(`fields.${field.name}`)}>
                        {field.label === "Term" ? (
                          <>
                            {terms
                              .filter(
                                (term) =>
                                  term.academicYearId === currentAcademicYear.id,
                              )
                              .map((term) => (
                                <option key={term.id} value={term.name}>
                                  {term.name}
                                </option>
                              ))}
                          </>
                        ) : field.label === "Employment type" ? (
                          <>
                            <option>Permanent</option>
                            <option>Contract</option>
                            <option>Temporary</option>
                          </>
                        ) : field.label === "Employer" ? (
                          <>
                            <option value="Goverment_Tsc">
                              Government (TSC)
                            </option>
                            <option value="County_Goverment">
                              County Government
                            </option>
                            <option value="School_Board_Bom">
                              School Board (BOM)
                            </option>
                            <option value="PRIVATE_OWNER">Private Owner</option>
                            <option value="FAITH_BASED">
                              Faith Based Organization
                            </option>
                            <option value="NGO">NGO</option>
                            <option value="AGENCY">Agency</option>
                          </>
                        ) : active === "Ward" ? (
                          <>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Under review</option>
                          </>
                        ) : (
                          <>
                            <option>Active</option>
                            <option>Inactive</option>
                            <option>Update needed</option>
                          </>
                        )}
                      </select>
                    ) : (
                      <>
                        <input
                          {...register(`fields.${field.name}`)}
                          type={field.inputType ?? "text"}
                          min={field.inputType === "number" ? "0" : undefined}
                          step={field.name === "meanScore" ? "0.01" : undefined}
                          placeholder={`Enter ${field.label.toLowerCase()}`}
                        />
                        {active === "School Performance" &&
                          field.showsPercentage && (
                            <span className="calculated-percentage">
                              {calculatePercentage(
                                watchedFields?.[field.name],
                                watchedFields?.candidates,
                              )}
                            </span>
                          )}
                      </>
                    )}
                  </label>
                ))}
              </div>
            </div>
            {saveError && (
              <p className="form-error" role="alert">
                {saveError}
              </p>
            )}
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <Button
                className="modal-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
