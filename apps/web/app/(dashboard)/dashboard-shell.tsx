"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { LoginPage } from "@scsms/features/auth/login-page";
import { EditRecordDialog } from "@scsms/features/dialogs/edit-record-dialog";
import { AddSchoolDialog } from "@scsms/features/dialogs/school-dialogs";
import { SearchDialog } from "@scsms/features/dialogs/search-dialog";
import Sidebar from "@scsms/features/navigation/sidebar";
import Topbar from "@scsms/features/navigation/topbar";
import { routeForModule } from "@scsms/features/navigation/route-for-module";
import { globalStyles } from "@scsms/ui/styles/app-styles";
import type {
  EditWardRecordFormValues,
  LoginFormValues,
} from "@scsms/features/types/forms";
import type { SessionUser } from "../session-user";
import { FeatureDataBoundary } from "./feature-data-boundary";

type EditDialogState = {
  active: string;
  item: string;
  wardCode?: string;
  wardId?: string;
};

export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const editableWardId =
    editDialog?.active === "Ward" ? editDialog.wardId : undefined;
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem("scsms-theme") === "dark",
  );
  const mobileNavOpen = mobileNavPath === pathname;

  useEffect(() => {
    let cancelled = false;

    fetch("/api/auth/session", { cache: "no-store" })
      .then(async (response) => {
        if (response.status === 401) return null;
        if (!response.ok) {
          throw new Error("Your session could not be verified.");
        }
        const payload: unknown = await response.json();
        if (
          !payload ||
          typeof payload !== "object" ||
          !("user" in payload) ||
          !payload.user ||
          typeof payload.user !== "object" ||
          !("email" in payload.user) ||
          typeof payload.user.email !== "string"
        ) {
          throw new Error("The session response was invalid.");
        }
        return { email: payload.user.email };
      })
      .then((user) => {
        if (!cancelled) {
          setSessionUser(user);
          setAuthError("");
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setAuthError(
            error instanceof Error
              ? error.message
              : "Your session could not be verified.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setSessionLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog("search");
      }

      if (event.key === "Escape") {
        setDialog(null);
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcut);
    return () => window.removeEventListener("keydown", handleKeyboardShortcut);
  }, []);

  useEffect(() => {
    const handleEditRecord = (event: Event) => {
      const detail = (event as CustomEvent<EditDialogState>).detail;

      if (!detail?.active || !detail?.item) return;

      setEditDialog({
        active: detail.active,
        item: detail.item,
        wardCode: detail.wardCode,
        wardId: detail.wardId,
      });
    };

    window.addEventListener("scsms-edit-record", handleEditRecord);
    return () =>
      window.removeEventListener("scsms-edit-record", handleEditRecord);
  }, []);

  const toggleTheme = () => {
    setDark((value) => {
      const next = !value;
      localStorage.setItem("scsms-theme", next ? "dark" : "light");
      return next;
    });
  };

  const login = (user: SessionUser) => {
    setSessionUser(user);
    setAuthError("");
  };

  const authenticate = async (values: LoginFormValues) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const payload: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        payload &&
          typeof payload === "object" &&
          "error" in payload &&
          typeof payload.error === "string"
          ? payload.error
          : "Email or password is incorrect.",
      );
    }
    if (
      !payload ||
      typeof payload !== "object" ||
      !("user" in payload) ||
      !payload.user ||
      typeof payload.user !== "object" ||
      !("email" in payload.user) ||
      typeof payload.user.email !== "string"
    ) {
      throw new Error("The login response was invalid.");
    }
    return { email: payload.user.email };
  };

  const logout = async () => {
    try {
      const response = await fetch("/api/auth/logout", { method: "POST" });
      if (!response.ok) throw new Error("Your session could not be closed.");
      setSessionUser(null);
      setAuthError("");
    } catch (error) {
      setAuthError(
        error instanceof Error ? error.message : "Your session could not be closed.",
      );
    }
  };

  if (sessionLoading) {
    return (
      <>
        <main className="auth-page">
          <section className="login-card">
            <p>Checking your session...</p>
          </section>
        </main>
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  if (!sessionUser) {
    return (
      <>
        <LoginPage
          authenticate={authenticate}
          onLogin={login}
          errorMessage={authError}
        />
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  return (
    <FeatureDataBoundary>
      <div
        className={`app ${dark ? "dark-theme" : ""} ${
          mobileNavOpen ? "mobile-nav-open" : ""
        }`}
      >
        <button
          className="mobile-nav-backdrop"
          type="button"
          onClick={() => setMobileNavPath(null)}
          aria-label="Close navigation menu"
        />
        <Sidebar
          collapsed={mobileNavOpen ? false : collapsed}
          setCollapsed={setCollapsed}
          onCloseMobile={() => setMobileNavPath(null)}
        />
        <div className="app-main">
          <Topbar
            onSearch={() => setDialog("search")}
            onSync={() => router.push("/synchronization")}
            dark={dark}
            onTheme={toggleTheme}
            user={sessionUser}
            onMenu={() => setMobileNavPath(pathname)}
            onProfile={() => router.push("/profile")}
            onLogout={logout}
          />
          {authError && (
            <p className="login-error" role="alert">
              {authError}
            </p>
          )}
          {children}
        </div>
        {dialog === "search" && (
          <SearchDialog
            onClose={() => setDialog(null)}
            setActive={(moduleName) => router.push(routeForModule(moduleName))}
          />
        )}
        {dialog === "add" && (
          <AddSchoolDialog onClose={() => setDialog(null)} />
        )}
        {editDialog && (
          <EditRecordDialog
            active={editDialog.active}
            item={editDialog.item}
            wardId={editDialog.wardId}
            wardCode={editDialog.wardCode}
            onClose={() => setEditDialog(null)}
            onSaveWard={
              editableWardId
                ? async (values: EditWardRecordFormValues) => {
                    const response = await fetch(
                      `/api/wards/${encodeURIComponent(editableWardId)}`,
                      {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(values),
                      },
                    );
                    const result: unknown = await response.json();
                    if (!response.ok) {
                      throw new Error(
                        result &&
                          typeof result === "object" &&
                          "error" in result &&
                          typeof result.error === "string"
                          ? result.error
                          : "The ward could not be saved.",
                      );
                    }
                  }
                : undefined
            }
          />
        )}
        <style jsx global>
          {globalStyles}
        </style>
      </div>
    </FeatureDataBoundary>
  );
}
