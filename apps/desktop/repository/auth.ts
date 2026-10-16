import { invoke, isTauri } from "@tauri-apps/api/core";

import type { SessionUser } from "@/app/session-user";
import type { LoginFormValues } from "@scsms/features/types/forms";

export async function loginWithLocalAccount(values: LoginFormValues) {
  if (!isTauri()) {
    throw new Error("Open the desktop application to sign in to the local database.");
  }

  return await invoke<SessionUser>("login", {
    credentials: {
      email: values.email,
      password: values.password,
    },
  });
}

export async function logoutLocalAccount() {
  if (isTauri()) await invoke("logout");
}
