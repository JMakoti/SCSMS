"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { profileSchema } from "../schemas/profile-schema";
import {
  profileDefaults,
  profileDetails,
} from "../../../database/seeders/profile";
import Link from "next/link";

type ProfileFormValues = z.infer<typeof profileSchema>;

const details = profileDetails;

export default function ProfilePageForm() {
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const { register, handleSubmit } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: profileDefaults,
  });
  const saveProfile = () => {
    setSaved(true);
    setEditing(false);
  };

  return (
    <main className="min-h-screen bg-slate-50 p-4 text-slate-800 dark:bg-slate-950 dark:text-slate-100 sm:p-8">
      <section className="mx-auto max-w-6xl">
        <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <Link className="profile-back-link" href="/">
              ← Back to dashboard
            </Link>
            <span className="eyebrow">Account settings</span>
            <h1>My profile</h1>
            <p>Manage your account information and access preferences.</p>
          </div>
          <button
            className="profile-edit-button"
            onClick={() => {
              setEditing(!editing);
              setSaved(false);
            }}
          >
            {editing ? "Cancel" : "Edit profile"}
          </button>
        </header>

        <div className="grid gap-5 lg:grid-cols-[280px_1fr]">
          <div className="contents">
            <section className="profile-identity-card">
              <div className="profile-large-avatar">EO</div>
              <h2>Education Officer</h2>
              <p>Sub-County Education Office</p>
              <span className="profile-status">
                <i /> Active account
              </span>
              <div className="profile-role-block">
                <span>Role</span>
                <strong>Education Officer</strong>
              </div>
              <div className="profile-role-block">
                <span>Access level</span>
                <strong>Administrator</strong>
              </div>
            </section>

            <form
              className="profile-details-card"
              onSubmit={handleSubmit(saveProfile)}
            >
              <div className="profile-section-heading">
                <div>
                  <h2>Personal information</h2>
                  <p>Your account and contact details</p>
                </div>
                {saved && <span className="profile-saved">Changes saved</span>}
              </div>
              <div className="profile-details-grid">
                {details.map(([label, field]) => (
                  <label key={label}>
                    <span>{label}</span>
                    <input {...register(field)} disabled={!editing} />
                  </label>
                ))}
              </div>
              {editing && (
                <button className="profile-save-button" type="submit">
                  Save changes
                </button>
              )}
            </form>

            <section className="profile-security-card">
              <div>
                <h2>Security</h2>
                <p>Keep your account protected.</p>
              </div>
              <button
                className="profile-secondary-button"
                onClick={() =>
                  window.alert(
                    "A password reset link would be sent to your email.",
                  )
                }
              >
                Change password
              </button>
            </section>
          </div>
        </div>
      </section>
    </main>
  );
}
