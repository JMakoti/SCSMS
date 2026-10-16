"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { profileSchema, changePasswordSchema, type ProfileFormValues, type ChangePasswordValues } from "../schemas/profile-schema";
import {
  ArrowLeft,
  BadgeCheck,
  Building2,
  CircleCheck,
  LockKeyhole,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  UserRound,
} from "lucide-react";
import { useFeatureData } from "../data/feature-data-context";

export default function ProfilePageForm({ onSaveProfile, onChangePassword }: {
  onSaveProfile: (values: ProfileFormValues) => Promise<ProfileFormValues>;
  onChangePassword: (values: ChangePasswordValues) => Promise<void>;
}) {
  const { profile: storedProfile, subCounties } = useFeatureData();
  const [savedValues, setSavedValues] = useState<ProfileFormValues | null>(null);
  const [editing, setEditing] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [profileError, setProfileError] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPasswords, setShowPasswords] = useState(false);
  const profile = savedValues ? {
    ...storedProfile, ...savedValues,
    location: subCounties.find((area) => area.id === savedValues.subcountyId)?.subCounty ?? "",
  } : storedProfile;
  const values: ProfileFormValues = { name: profile.name ?? "", email: profile.email, phone: profile.phone, subcountyId: profile.subcountyId ?? "" };
  const accountForm = useForm<ProfileFormValues>({ resolver: zodResolver(profileSchema), defaultValues: values });
  const passwordForm = useForm<ChangePasswordValues>({ resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const saveProfile = accountForm.handleSubmit(async (input) => {
    setProfileError(""); setProfileMessage("");
    try {
      const updated = await onSaveProfile(input);
      setSavedValues(updated); accountForm.reset(updated); setEditing(false);
      setProfileMessage("Your profile has been updated.");
      window.dispatchEvent(new Event("scsms:feature-data-refresh"));
    } catch (error) { setProfileError(error instanceof Error ? error.message : String(error)); }
  });
  const savePassword = passwordForm.handleSubmit(async (input) => {
    setPasswordError(""); setPasswordMessage("");
    try {
      await onChangePassword(input);
      passwordForm.reset(); setShowPasswords(false);
      setPasswordMessage("Password changed. Use your new password next time you sign in.");
    } catch (error) { setPasswordError(error instanceof Error ? error.message : String(error)); }
  });
  const displayName =
    profile.name?.trim() || profile.email.split("@")[0] || "Education Officer";
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  const fields = [
    { label: "Email address", value: profile.email, icon: Mail },
    { label: "Phone number", value: profile.phone, icon: Phone },
    { label: "Department / access role", value: profile.department, icon: Building2 },
    { label: "Sub-county / location", value: profile.location, icon: MapPin },
  ];

  return (
    <main className="content account-profile">
      <Link className="account-profile-back" href="/users">
        <ArrowLeft size={14} aria-hidden="true" /> Users &amp; Roles
      </Link>
      <header className="account-profile-heading">
        <div>
          <span className="eyebrow">Account</span>
          <h1>My profile</h1>
          <p>Your account details and system access.</p>
        </div>
        <span className="account-profile-session"><span /> Signed in</span>
      </header>

      <section className="account-profile-identity" aria-label="Account overview">
        <div className="account-profile-avatar" aria-hidden="true">{initials}</div>
        <div className="account-profile-identity-copy">
          <div className="account-profile-name">
            <h2>{displayName}</h2>
            <BadgeCheck size={19} aria-label="Active account" />
          </div>
          <p>{profile.email || "Email not available"}</p>
          <div className="account-profile-tags">
            <span><UserRound size={13} aria-hidden="true" /> Education Officer</span>
            {profile.location && <span><MapPin size={13} aria-hidden="true" />{profile.location}</span>}
          </div>
        </div>
        <div className="account-profile-office">
          <Building2 size={19} aria-hidden="true" />
          <div><span>Organization</span><strong>Sub-County Education Office</strong></div>
        </div>
      </section>

      <div className="account-profile-grid">
        <section className="account-profile-panel" aria-labelledby="account-details-title">
          <div className="account-profile-panel-heading">
            <span className="account-profile-section-icon"><UserRound size={17} aria-hidden="true" /></span>
            <div><h2 id="account-details-title">Personal information</h2><p>Contact and office details for your signed-in account.</p></div>
          </div>
          <div className="account-profile-edit-bar">
            {!editing && <button className="outline-button" type="button" onClick={() => { accountForm.reset(values); setEditing(true); setProfileMessage(""); setProfileError(""); }}>Edit details</button>}
            {profileMessage && <p className="account-profile-feedback" role="status">{profileMessage}</p>}
          </div>
          {editing ? (
            <form onSubmit={saveProfile} noValidate>
              <div className="account-profile-edit-fields">
                {([['Full name', 'name', 'text', 'name'], ['Email address', 'email', 'email', 'email'], ['Phone number', 'phone', 'tel', 'tel']] as const).map(([label, field, type, autoComplete]) => (
                  <label key={field}>
                    <span>{label}</span>
                    <input {...accountForm.register(field)} type={type} autoComplete={autoComplete} readOnly={field === "email"} disabled={accountForm.formState.isSubmitting} aria-invalid={!!accountForm.formState.errors[field]} aria-describedby={field === "email" ? "profile-email-note" : accountForm.formState.errors[field] ? 'profile-' + field + '-error' : undefined} />
                    {field === "email" && <small id="profile-email-note">Your sign-in email cannot be changed.</small>}
                    {accountForm.formState.errors[field] && <small className="form-error" id={'profile-' + field + '-error'}>{accountForm.formState.errors[field]?.message}</small>}
                  </label>
                ))}
                <label><span>Sub-county</span>
                  <input value={profile.location || "Not assigned"} readOnly aria-describedby="profile-subcounty-note" />
                  <input type="hidden" {...accountForm.register("subcountyId")} />
                  <small id="profile-subcounty-note">Your assigned sub-county cannot be changed.</small>
                  {accountForm.formState.errors.subcountyId && <small className="form-error">{accountForm.formState.errors.subcountyId.message}</small>}
                </label>
              </div>
              {profileError && <p className="account-profile-form-error" role="alert">{profileError}</p>}
              <div className="account-profile-form-actions">
                <button className="outline-button" type="button" disabled={accountForm.formState.isSubmitting} onClick={() => { accountForm.reset(values); setEditing(false); setProfileError(""); }}>Cancel</button>
                <button className="account-profile-submit" type="submit" disabled={accountForm.formState.isSubmitting}>{accountForm.formState.isSubmitting ? "Saving..." : "Save details"}</button>
              </div>
            </form>
          ) : <dl className="account-profile-fields">
            {fields.map(({ label, value, icon: Icon }) => (
              <div className="account-profile-field" key={label}>
                <dt><Icon size={14} aria-hidden="true" />{label}</dt>
                <dd className={value ? undefined : "account-profile-empty"}>{value || "Not provided"}</dd>
              </div>
            ))}
          </dl>}
          <div className="account-profile-panel-note"><CircleCheck size={14} aria-hidden="true" />Account information from your user record.</div>
        </section>

        <div className="account-profile-sidebar">
        <aside className="account-profile-panel" aria-labelledby="account-access-title">
          <div className="account-profile-panel-heading">
            <span className="account-profile-section-icon"><ShieldCheck size={17} aria-hidden="true" /></span>
            <div><h2 id="account-access-title">Role &amp; access</h2><p>Your place in the system.</p></div>
          </div>
          <dl className="account-profile-access">
            <div><dt>Assigned profile</dt><dd>Education Officer</dd></div>
            <div><dt>Access role</dt><dd>{profile.department || "Not provided"}</dd></div>
            <div><dt>Account status</dt><dd><span className="account-profile-active"><span />Active</span></dd></div>
          </dl>
          <div className="account-profile-security">
            <LockKeyhole size={17} aria-hidden="true" />
            <div><h3>Keep your account secure</h3><p>Use Log out in the topbar when you finish working.</p></div>
          </div>
        </aside>
        <section className="account-profile-panel" aria-labelledby="change-password-title">
          <div className="account-profile-panel-heading">
            <span className="account-profile-section-icon"><LockKeyhole size={17} aria-hidden="true" /></span>
            <div><h2 id="change-password-title">Change password</h2><p>Choose a new password for your account.</p></div>
          </div>
          <form onSubmit={savePassword} noValidate>
            <div className="account-profile-password-fields">
              {([['Current password', 'currentPassword', 'current-password'], ['New password', 'newPassword', 'new-password'], ['Confirm new password', 'confirmPassword', 'new-password']] as const).map(([label, field, autoComplete]) => (
                <label key={field}>
                  <span>{label}</span>
                  <input {...passwordForm.register(field)} type={showPasswords ? "text" : "password"} autoComplete={autoComplete} disabled={passwordForm.formState.isSubmitting} aria-invalid={!!passwordForm.formState.errors[field]} aria-describedby={passwordForm.formState.errors[field] ? 'password-' + field + '-error' : undefined} />
                  {passwordForm.formState.errors[field] && <small className="form-error" id={'password-' + field + '-error'}>{passwordForm.formState.errors[field]?.message}</small>}
                </label>
              ))}
              <p className="account-profile-password-hint">Use at least 8 characters. Your new password must be different from your current one.</p>
              <label className="account-profile-show-password"><input type="checkbox" checked={showPasswords} onChange={(event) => setShowPasswords(event.target.checked)} />Show passwords</label>
            </div>
            {passwordError && <p className="account-profile-form-error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="account-profile-feedback account-profile-password-feedback" role="status">{passwordMessage}</p>}
            <div className="account-profile-form-actions"><button className="account-profile-submit" type="submit" disabled={passwordForm.formState.isSubmitting}>{passwordForm.formState.isSubmitting ? "Changing..." : "Change password"}</button></div>
          </form>
        </section>
        </div>
      </div>
    </main>
  );
}
