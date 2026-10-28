export type SessionUser = {
  id?: string;
  name?: string;
  email: string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
};


// Remove login details cached by older versions; current logins stay in React state.
export function clearSessionUser() {
  try {
    localStorage.removeItem("scsms-session-user");
  } catch {
    // Signing in and out still works when browser storage is unavailable.
  }
}
