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

export async function loadSignupOptions() {
  if (!isTauri()) throw new Error("Open the desktop application to create an account.");
  return invoke<import("@scsms/features/auth/login-page").SignupOptions>("signup_options");
}
export async function signup(values: import("@scsms/features/auth/login-page").SignupValues) {
  if (!isTauri()) throw new Error("Open the desktop application to create an account.");
  await invoke("signup", { values });
}
