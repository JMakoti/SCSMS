import type { ProfileFormValues, ChangePasswordValues } from "@scsms/features/schemas/profile-schema";

async function saveAccount(path: string, method: string, values: unknown) {
  const response = await fetch(path, {
    method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(values),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "Your account could not be updated.");
  return result;
}

export async function updateAccountProfile(values: ProfileFormValues): Promise<ProfileFormValues> {
  const result = await saveAccount("/api/account/profile", "PATCH", values);
  return result.profile;
}

export async function changeAccountPassword(values: ChangePasswordValues) {
  await saveAccount("/api/account/password", "POST", values);
}
