"use client";

import ProfilePageForm from "@scsms/features/profile/profile-form";
import { updateAccountProfile, changeAccountPassword } from "@/repository/account";

export default function ProfilePage() {
  return <ProfilePageForm onSaveProfile={updateAccountProfile} onChangePassword={changeAccountPassword} />;
}
