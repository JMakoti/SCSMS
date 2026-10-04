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
import {
  getRabaiWardInfo,
  rabaiSchools,
  rabaiWards,
} from "../data/fixtures/rabai-schools";
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
import { staffRecords } from "../data/fixtures/staff";
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
  onClose,
}: {
  active: string;
  item: string;
  onClose: () => void;
}) {
  const [saved, setSaved] = useState(false);
  const wardInfo = active === "Ward" ? getRabaiWardInfo(item) : null;
  const schoolInfo =
    active === "Schools"
      ? (rabaiSchools.find(
        (school) =>
          school.displayName === item ||
          school.officialName === item ||
          school.schoolCode === item,
      ) ?? rabaiSchools[0])
      : null;
  const staffInfo =
    active === "Staff"
      ? staffRecords.find((record) => record.name === item)
      : null;
  const staffIndex =
    active === "Staff"
      ? staffRecords.findIndex((record) => record.name === item)
      : -1;
  const fields: EditField[] =
    active === "Schools"
      ? [
        { label: "School code", name: "schoolCode" },
        { label: "UIC code", name: "uicCode" },
        { label: "KNEC code", name: "knecCode" },
        { label: "TSC code", name: "tscCode" },
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
                    { label: "County", name: "county" },
                    { label: "County code", name: "countyCode" },
                    { label: "Sub-County", name: "subCounty" },
                    { label: "Sub-County code", name: "subCountyCode" },
                    { label: "Constituency", name: "constituency" },
                    { label: "Constituency code", name: "constituencyCode" },
                  ]
                  : ["Report type", "Reporting period", "Description"].map(
                    (label) => ({ label, name: label }),
                  );

  const getDefaultValue = (field: EditField) => {
    if (active === "Schools" && schoolInfo) {
      const values: Record<string, string> = {
        schoolCode: schoolInfo.schoolCode ?? "",
        uicCode: schoolInfo.uicCode ?? "",
        knecCode: "",
        tscCode: "",
        regNumber: "",
        officialName: schoolInfo.officialName,
        displayName: schoolInfo.displayName,
        institutionType: getSchoolClassification(schoolInfo),
        sourceInstitutionType: schoolInfo.sourceInstitutionType ?? "",
        registrationStatus: getSchoolRegistrationStatus(schoolInfo),
        level: getSchoolLevel(schoolInfo),
        ownershipType: getSchoolOwnership(schoolInfo),
        genderType: schoolInfo.genderType,
        boardingType: schoolInfo.boardingType,
        titleDeed: getSchoolTitleDeed(),
        county: schoolInfo.county,
        subCounty: schoolInfo.subCounty,
        ward: schoolInfo.ward ?? "",
        location: schoolInfo.location ?? "",
        address: schoolInfo.address ?? "",
        phone: schoolInfo.phone ?? "",
        email: schoolInfo.email ?? "",
        latitude: String(schoolInfo.latitude ?? ""),
        longitude: String(schoolInfo.longitude ?? ""),
        sne: schoolInfo.sne,
        isActive: schoolInfo.isActive ? "Active" : "Inactive",
        dataConfidence: schoolInfo.dataConfidence,
      };

      return values[field.name] ?? "";
    }

    if (active === "Ward") {
      const values: Record<string, string> = {
        wardName: wardInfo?.wardName ?? item,
        wardCode: wardInfo?.wardCode ?? "",
        county: wardInfo?.county ?? "Kilifi",
        countyCode: wardInfo?.countyCode ?? "003",
        subCounty: wardInfo?.subCounty ?? "Rabai",
        subCountyCode: wardInfo?.subCountyCode ?? "014",
        constituency: wardInfo?.constituency ?? "Rabai",
        constituencyCode: wardInfo?.constituencyCode ?? "014",
      };

      return values[field.name] ?? "";
    }

    if (active === "Staff") {
      const staffEmail = staffInfo
        ? `${staffInfo.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, ".")
          .replace(/^\.+|\.+$/g, "")}@school.example`
        : "";
      const values: Record<string, string> = {
        "Full name": staffInfo?.name ?? item,
        Designation: staffInfo?.role ?? "Teacher",
        "Assigned school": "Mwangaza Primary School",
        "Employment type": "Permanent",
        Employer: "Goverment_Tsc",
        "TSC No.":
          staffIndex >= 0
            ? `TSC-${String(staffIndex + 12).padStart(4, "0")}`
            : "",
        "Email address": staffEmail,
        "Phone number": staffInfo?.phone ?? "",
        "Date joined": "2023-01-15",
      };

      return values[field.label] ?? "";
    }

    if (active === "School Performance") {
      const values: Record<string, string> = {
        school: item,
        assessment: item.toLowerCase().includes("junior")
          ? "KJSEA"
          : item.toLowerCase().includes("secondary") ||
            item.toLowerCase().includes("senior")
            ? "KCSE"
            : "KPSEA",
        academicYear: "2026",
        level: item.toLowerCase().includes("junior")
          ? "Junior Secondary"
          : item.toLowerCase().includes("secondary") ||
            item.toLowerCase().includes("senior")
            ? "Senior School"
            : "Primary",
        knecCode: "04122123",
        candidates: "50",
        meanScore: "9.30",
        subjects: "12",
        bestSubject: "Mathematics",
        exceedingCount: "12",
        meetingCount: "24",
        approachingCount: "10",
        belowCount: "4",
        notes: "Latest assessment record",
      };

      return values[field.name] ?? "";
    }

    return field.label === "School" || field.label === "Assigned school"
      ? item
      : field.label === "Full name"
        ? item
        : field.label === "Academic year"
          ? "2026"
          : field.label === "Male learners"
            ? "32"
            : field.label === "Female learners"
              ? "29"
              : field.label === "Term"
                ? "Term 1"
                : field.label === "Employment type"
                  ? "Permanent"
                  : field.label === "Status"
                    ? "Active"
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
      { label: "Not mapped", value: "" },
      ...rabaiWards.map((ward) => ({
        label: ward.wardName,
        value: ward.wardName,
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
            <h3>Changes saved locally</h3>
            <p>The updated record is queued for synchronization.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSaved(true))}>
            <div className="form-section">
              <h3>Record information</h3>
              <div className="form-grid">
                {fields.map((field) => (
                  <label key={field.name}>
                    {field.label}
                    {active === "Schools" && schoolSelectOptions[field.name] ? (
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
                            <option>Term 1</option>
                            <option>Term 2</option>
                            <option>Term 3</option>
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
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <Button className="modal-primary-button" type="submit">
                Save changes
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
