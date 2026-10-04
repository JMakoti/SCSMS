export type SessionUser = {
  id?: string;
  name?: string;
  email: string;
  roleId?: string;
  roleName?: string;
  permissions?: string[];
};

const sessionUserKey = "scsms-session-user";

export function readSessionUser() {
  if (typeof window === "undefined") return null;

  const storedUser = localStorage.getItem(sessionUserKey);
  if (!storedUser) return null;

  try {
    return JSON.parse(storedUser) as SessionUser;
  } catch {
    localStorage.removeItem(sessionUserKey);
    return null;
  }
}

export function saveSessionUser(user: SessionUser) {
  localStorage.setItem(sessionUserKey, JSON.stringify(user));
}

export function clearSessionUser() {
  localStorage.removeItem(sessionUserKey);
}
