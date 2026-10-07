"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@scsms/ui/components/button";
import { addContactSchema } from "../schemas/add-contact-schema";
import { addSchoolSchema } from "../schemas/add-school-schema";
import type {
  AddContactFormValues,
  AddSchoolFormValues,
} from "../types/forms";
import {
  schoolBoardingOptions,
  schoolClassificationOptions,
  schoolGenderOptions,
  schoolLevelOptions,
  schoolOwnershipOptions,
  schoolRegistrationStatusOptions,
  schoolTitleDeedOptions,
} from "../schools/school-display";
import { useFeatureData } from "../data/feature-data-context";
import { Check, Upload, X } from "lucide-react";
import { useForm } from "react-hook-form";
export function AddContactDialog({ onClose }: { onClose: () => void }) {
  const { schools } = useFeatureData();
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: { school: "", role: "Head teacher", status: "Active" },
  });
  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(event) => event.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Contact management</span>
            <h2>Add contact</h2>
            <p>Create a contact record and assign it to a school.</p>
          </div>
          <button
            className="icon-button"
            onClick={onClose}
            aria-label="Close add contact form"
          >
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>Contact saved locally</h3>
            <p>The contact has been added to the synchronization queue.</p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSaved(true))}>
            <div className="form-section">
              <h3>Contact details</h3>
              <div className="form-grid">
                <label>
                  School
                  <select {...register("school")}>
                    <option value="" disabled>
                      Select a school
                    </option>
                    {[...schools]
                      .sort((a, b) =>
                        a.displayName.localeCompare(b.displayName),
                      )
                      .map((school) => (
                        <option key={school.id} value={school.id}>
                          {school.displayName} -{" "}
                          {school.schoolCode ?? "No code"}
                        </option>
                      ))}
                  </select>
                </label>
                <label>
                  Contact role
                  <select {...register("role")}>
                    <option>Head teacher</option>
                    <option>Deputy head teacher</option>
                    <option>School bursar</option>
                    <option>School secretary</option>
                  </select>
                </label>
                <label>
                  Full name
                  <input
                    {...register("fullName")}
                    placeholder="Enter full name"
                    autoFocus
                  />
                </label>
                <label>
                  Email address
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="name@example.com"
                  />
                </label>
                <label>
                  Phone number
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+254 700 000 000"
                  />
                </label>
                <label>
                  Status
                  <select {...register("status")}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
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
              <button className="modal-primary-button" type="submit">
                Save contact
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export function AddSchoolDialog({
  onClose,
  onSave,
  onChooseFile,
}: {
  onClose: () => void;
  onSave?: (values: AddSchoolFormValues) => Promise<void>;
  onChooseFile?: () => Promise<string | null>;
}) {
  const { wardOptions } = useFeatureData();
  const sortedWards = [...wardOptions].sort((a, b) =>
    a.name.localeCompare(b.name),
  );
  const defaultWard = sortedWards[0];
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<AddSchoolFormValues>({
      resolver: zodResolver(addSchoolSchema),
      defaultValues: {
        institutionType: "Regular",
        registrationStatus: "REGISTERED",
        level: "Primary",
        ownershipType: "Goverment",
        genderType: "MIXED",
        boardingType: "DAY",
        titleDeed: "NO",
        county: defaultWard?.county ?? "",
        subCounty: defaultWard?.subCounty ?? "",
        ward: defaultWard?.id ?? "",
        sne: "NO",
        isActive: "Active",
      },
    });
  const selectedFilePath = watch("filePath");

  const saveSchool = async (values: AddSchoolFormValues) => {
    setSaveError("");
    setSaving(true);
    try {
      if (!onSave) {
        throw new Error("School database save is not configured.");
      }
      await onSave(values);
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      window.dispatchEvent(new Event("scsms:academic-years-refresh"));
      setSaved(true);
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to save the school.",
      );
    } finally {
      setSaving(false);
    }
  };

  const chooseSchoolFile = async () => {
    if (!onChooseFile) return;
    setSaveError("");
    try {
      const filePath = await onChooseFile();
      if (filePath) {
        setValue("filePath", filePath, { shouldDirty: true });
      }
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : "Unable to select the file.",
      );
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="form-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="dialog-head">
          <div>
            <span className="eyebrow">School management</span>
            <h2>Add new school</h2>
            <p>Create an official school registry record</p>
          </div>
          <button className="icon-button" onClick={onClose}>
            <X />
          </button>
        </div>
        {saved ? (
          <div className="success-state">
            <div>
              <Check />
            </div>
            <h3>School saved</h3>
            <p>
              {onSave
                ? "The school record has been saved to the database."
                : "School database saving is not available in this app."}
            </p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(saveSchool)}>
            <div className="form-section">
              <h3>Basic information</h3>
              <div className="form-grid">
                <div className="form-grid-full school-logo-field">
                  <span>School logo</span>
                  <div className="school-file-picker">
                    <input
                      {...register("filePath")}
                      value={selectedFilePath ?? ""}
                      readOnly
                      aria-label="Selected school logo file"
                      placeholder="No logo file selected"
                    />
                    <button
                      className="outline-button"
                      type="button"
                      onClick={chooseSchoolFile}
                      disabled={!onChooseFile}
                    >
                      <Upload size={14} />
                      Choose logo file
                    </button>
                  </div>
                </div>
                <label>
                  School code
                  <input
                    {...register("schoolCode")}
                    placeholder="School Code"
                  />
                  {errors.schoolCode?.message && (
                    <span className="form-error">{errors.schoolCode.message}</span>
                  )}
                </label>
                <label>
                  UIC code
                  <input
                    {...register("uicCode")}
                    placeholder="NEMIS/UIC Code"
                  />
                  {errors.uicCode?.message && (
                    <span className="form-error">{errors.uicCode.message}</span>
                  )}
                </label>
                <label>
                  KNEC code
                  <input {...register("knecCode")} placeholder="KNEC Code" />
                </label>
                <label>
                  TSC code
                  <input {...register("tscCode")} placeholder="TSC Code" />
                </label>
                <label>
                  Registration Number
                  <input
                    {...register("regNumber")}
                    placeholder="Registration Number"
                  />
                </label>
                <label>
                  Official school name
                  <input
                    {...register("officialName")}
                    placeholder="Enter official school name"
                    autoFocus
                  />
                </label>
                <label>
                  Display name
                  <input
                    {...register("displayName")}
                    placeholder="Enter display name"
                  />
                </label>
                <label>
                  Institution type
                  <select {...register("institutionType")}>
                    {schoolClassificationOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Registration Status
                  <select {...register("registrationStatus")}>
                    {schoolRegistrationStatusOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Level
                  <select {...register("level")}>
                    {schoolLevelOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Ownership
                  <select {...register("ownershipType")}>
                    {schoolOwnershipOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Gender
                  <select {...register("genderType")}>
                    {schoolGenderOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Boarding
                  <select {...register("boardingType")}>
                    {schoolBoardingOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Title deed
                  <select {...register("titleDeed")}>
                    {schoolTitleDeedOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
            <div className="form-section">
              <h3>Location</h3>
              <div className="form-grid">
                <label>
                  County
                  <input {...register("county")} />
                </label>
                <label>
                  Sub-County
                  <input {...register("subCounty")} />
                </label>
                <label>
                  Ward
                  <select
                    {...register("ward", {
                      onChange: (event) => {
                        const ward = sortedWards.find(
                          (record) => record.id === event.target.value,
                        );
                        if (ward?.county) {
                          setValue("county", ward.county, {
                            shouldValidate: true,
                          });
                        }
                        if (ward?.subCounty) {
                          setValue("subCounty", ward.subCounty, {
                            shouldValidate: true,
                          });
                        }
                      },
                    })}
                  >
                    <option value="">Select a ward</option>
                    {sortedWards.map((ward) => (
                      <option key={ward.id} value={ward.id}>
                        {ward.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Location
                  <input
                    {...register("location")}
                    placeholder="Enter location"
                  />
                </label>
                <label>
                  Address
                  <input {...register("address")} placeholder="P.O. Box..." />
                </label>
                <label>
                  Phone
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+254 700 000 000"
                  />
                </label>
                <label>
                  Email
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="school@example.com"
                  />
                </label>
                <label>
                  Latitude
                  <input {...register("latitude")} placeholder="-3.92" />
                </label>
                <label>
                  Longitude
                  <input {...register("longitude")} placeholder="39.56" />
                </label>
              </div>
            </div>
            <div className="form-section">
              <h3>Classification</h3>
              <div className="form-grid">
                <label>
                  SNE
                  <select {...register("sne")}>
                    <option value="NO">No</option>
                    <option value="YES">Yes</option>
                  </select>
                </label>
                <label>
                  Status
                  <select {...register("isActive")}>
                    <option>Active</option>
                    <option>Inactive</option>
                  </select>
                </label>
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
              <button
                className="outline-button"
                type="submit"
                disabled={saving}
              >
                Save & Add Another
              </button>
              <Button
                className="modal-primary-button"
                type="submit"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save School"}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
