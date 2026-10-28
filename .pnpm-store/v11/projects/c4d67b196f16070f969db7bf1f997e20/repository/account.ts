import { invoke } from "@tauri-apps/api/core";
import type { ProfileFormValues, ChangePasswordValues } from "@scsms/features/schemas/profile-schema";

export async function updateAccountProfile(values: ProfileFormValues) {
  const profile = await invoke<ProfileFormValues>("update_account_profile", { values });
  window.dispatchEvent(new CustomEvent("scsms:account-updated", { detail: profile }));
  return profile;
}

export async function changeAccountPassword(values: ChangePasswordValues) {
  await invoke("change_account_password", { values });
}
