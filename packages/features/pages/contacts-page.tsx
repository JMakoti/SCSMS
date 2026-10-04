"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check, Pencil, Plus, Trash2, Users, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { schoolContactGroups } from "../data/fixtures/contacts";
import { rabaiSchools } from "../data/fixtures/rabai-schools";
import { addContactSchema } from "../schemas/add-contact-schema";
import type { AddContactFormValues } from "../types/forms";
import { ConfirmDeleteDialog } from "../ui/confirm-delete-dialog";

const registrySchools = [...rabaiSchools].sort((a, b) =>
  a.displayName.localeCompare(b.displayName),
);

export function LegacyAddContactDialog({
  onClose,
  school = registrySchools[0]?.displayName,
}: {
  onClose: () => void;
  school?: string;
}) {
  const [saved, setSaved] = useState(false);
  const selectedSchool =
    registrySchools.find((record) => record.displayName === school) ??
    registrySchools[0];
  const { register, handleSubmit } = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      school: selectedSchool.id,
      role: "Head teacher",
      status: "Active",
    },
  });
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="form-dialog contact-modal"
        role="dialog"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="dialog-head">
          <div>
            <span className="eyebrow">Contact management</span>
            <h2>Add contact</h2>
            <p>Create a contact record for a school.</p>
          </div>
          <button
            className="icon-button"
            type="button"
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
            <h3>Contact saved</h3>
            <p>The contact has been added to the synchronization queue.</p>
            <button className="outline-button" type="button" onClick={onClose}>
              Done
            </button>
          </div>
        ) : (
          <form
            className="modal-form"
            onSubmit={handleSubmit(() => setSaved(true))}
          >
            <div className="form-section">
              <h3>Contact details</h3>
              <div className="form-grid">
                <label>
                  School
                  <input type="hidden" {...register("school")} />
                  <div className="selected-school-field">
                    <strong>{selectedSchool.displayName}</strong>
                    <span>
                      {selectedSchool.schoolCode ?? "No code"} - Selected school
                    </span>
                  </div>
                </label>
                <label>
                  Contact role
                  <select {...register("role")}>
                    <option>Head teacher</option>
                    <option>Deputy head teacher</option>
                    <option>School bursar</option>
                  </select>
                </label>
                <label>
                  Full name
                  <input
                    {...register("fullName")}
                    placeholder="Enter full name"
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

function SchoolContactsContent({ school }: { school?: string }) {
  const [showContactModal, setShowContactModal] = useState(false);
  const [deleteItem, setDeleteItem] = useState<string | null>(null);
  const selectedSchool =
    registrySchools.find((record) => record.displayName === school) ??
    registrySchools[0];
  const groups = schoolContactGroups;
  return (
    <div className="school-contacts-grid">
      {deleteItem && (
        <ConfirmDeleteDialog
          item={deleteItem}
          onCancel={() => setDeleteItem(null)}
          onConfirm={() => setDeleteItem(null)}
        />
      )}
      {showContactModal && (
        <LegacyAddContactDialog
          school={selectedSchool.displayName}
          onClose={() => setShowContactModal(false)}
        />
      )}
      <div className="contact-page-action">
        <button
          className="edit-school-button"
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setShowContactModal(true);
          }}
        >
          <Plus data-icon="inline-start" />
          Add Contact
        </button>
      </div>
      {groups.map((group) => (
        <section className="panel school-contact-card" key={group.title}>
          <div className="school-contact-heading">
            <div className="school-contact-avatar">
              <Users />
            </div>
            <div>
              <h2>{group.title}</h2>
              <p>{selectedSchool.displayName} contact details</p>
            </div>
            <div className="school-contact-card-actions">
              <button
                className="edit-school-button contact-action-button"
                aria-label={`Edit ${group.title}`}
                onClick={() =>
                  window.dispatchEvent(
                    new CustomEvent("scsms-edit-record", {
                      detail: { active: "School Contacts", item: group.title },
                    }),
                  )
                }
              >
                <Pencil />
              </button>
              <button
                aria-label={`Delete ${group.title}`}
                onClick={() => setDeleteItem(group.title)}
              >
                <Trash2 />
              </button>
            </div>
          </div>
          <div className="school-contact-list">
            <div className="school-contact-primary">
              <span className="contact-field-label">Name</span>
              <strong>{group.person.name}</strong>
              <span className="contact-field-label">Email</span>
              <a href={`mailto:${group.person.email}`}>{group.person.email}</a>
            </div>
            <div className="school-contact-divider" />
            {group.person.contacts.map((contact) => (
              <div className="school-contact-row" key={contact.label}>
                <span className="contact-number">
                  {contact.label.includes("2") ? "2" : "1"}
                </span>
                <div>
                  <strong>{contact.label}</strong>
                  <span>{contact.phone}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

export default SchoolContactsContent;
