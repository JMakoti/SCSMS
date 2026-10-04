import { invoke } from "@tauri-apps/api/core";

import type { SessionUser } from "@/app/session-user";
import type { LoginFormValues } from "@scsms/features/types/forms";

export async function loginWithLocalAccount(values: LoginFormValues) {
  return await invoke<SessionUser>("login", {
    credentials: {
      email: values.email,
      password: values.password,
    },
  });
}
