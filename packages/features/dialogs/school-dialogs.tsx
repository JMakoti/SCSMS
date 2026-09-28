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
import { rabaiSchools, rabaiWards } from "../../../database/seeders/rabai-schools";
import { Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
export function AddContactDialog({ onClose }: { onClose: () => void }) {
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
                    {[...rabaiSchools]
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

export function AddSchoolDialog({ onClose }: { onClose: () => void }) {
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<AddSchoolFormValues>({
    resolver: zodResolver(addSchoolSchema),
    defaultValues: {
      institutionType: "Regular",
      registrationStatus: "REGISTERED",
      level: "Primary",
      ownershipType: "Goverment",
      genderType: "MIXED",
      boardingType: "DAY",
      titleDeed: "NO",
      county: "Kilifi",
      subCounty: "Rabai",
      ward: "Mwawesa",
      sne: "NO",
      isActive: "Active",
    },
  });
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
            <h3>School saved locally</h3>
            <p>
              The record has been saved and added to the synchronization queue.
            </p>
            <button className="outline-button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit(() => setSaved(true))}>
            <div className="form-section">
              <h3>Basic information</h3>
              <div className="form-grid">
                <label>
                  School code
                  <input
                    {...register("schoolCode")}
                    placeholder="School Code"
                  />
                </label>
                <label>
                  UIC code
                  <input
                    {...register("uicCode")}
                    placeholder="NEMIS/UIC Code"
                  />
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
                  <select {...register("ward")}>
                    <option value="">Not mapped</option>
                    {rabaiWards.map((ward) => (
                      <option key={ward.wardCode} value={ward.wardName}>
                        {ward.wardName}
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
            <div className="dialog-footer">
              <button
                className="outline-button"
                type="button"
                onClick={onClose}
              >
                Cancel
              </button>
              <button className="outline-button" type="submit">
                Save & Add Another
              </button>
              <Button className="modal-primary-button" type="submit">
                Save School
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
