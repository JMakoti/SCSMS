"use client";

import { usePathname, useRouter } from "next/navigation";
// import { type ReactNode, useEffect, useState } from "react";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { AcademicYearProvider } from "@scsms/features/academic-years/academic-year-context";
import { LoginPage } from "@scsms/features/auth/login-page";
import { EditRecordDialog } from "@scsms/features/dialogs/edit-record-dialog";
import { AddSchoolDialog } from "@scsms/features/dialogs/school-dialogs";
import { SearchDialog } from "@scsms/features/dialogs/search-dialog";
import Sidebar from "@scsms/features/navigation/sidebar";
import Topbar from "@scsms/features/navigation/topbar";
import { routeForModule } from "@scsms/features/navigation/route-for-module";
import { globalStyles } from "@scsms/ui/styles/app-styles";
import {
  clearSessionUser,
  readSessionUser,
  saveSessionUser,
  type SessionUser,
} from "../session-user";

type EditDialogState = {
  active: string;
  item: string;
};

const subscribeToHydration = () => () => { };
const getClientHydrated = () => true;
const getServerHydrated = () => false;


export function DashboardShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const hydrated = useSyncExternalStore(
    subscribeToHydration,
    getClientHydrated,
    getServerHydrated,
  );
  // const [sessionUser, setSessionUser] = useState<SessionUser | null>(
  //   readSessionUser,
  // );
  const [sessionOverride, setSessionOverride] = useState<
    SessionUser | null | undefined
  >(undefined);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);

  // const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  // const [collapsed, setCollapsed] = useState(false);
  // const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  // const [dialog, setDialog] = useState<string | null>(null);
  // const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  // const [dark, setDark] = useState(
  //   () =>
  //     typeof window !== "undefined" &&
  //     localStorage.getItem("scsms-theme") === "dark",
  // );
  // const [dark, setDark] = useState(false);
  // const mobileNavOpen = mobileNavPath === pathname;
  const sessionUser =
    sessionOverride === undefined
      ? hydrated
        ? readSessionUser()
        : null
      : sessionOverride;
  const dark =
    darkOverride ??
    (hydrated && localStorage.getItem("scsms-theme") === "dark");
  const mobileNavOpen = mobileNavPath === pathname;


  // useEffect(() => {

  //   const handleKeyboardShortcut = (event: KeyboardEvent) => {
  //     if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
  //       event.preventDefault();
  //       setDialog("search");
  //     }

  //     if (event.key === "Escape") {
  //       setDialog(null);
  //     }
  //   };

  //   window.addEventListener("keydown", handleKeyboardShortcut);
  //   setSessionUser(readSessionUser());
  //   setDark(localStorage.getItem("scsms-theme") === "dark");
  //   return () => window.removeEventListener("keydown", handleKeyboardShortcut);

  // }, []);
  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog("search");
      }

      if (event.key === "Escape") setDialog(null);
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
      });
    };

    window.addEventListener("scsms-edit-record", handleEditRecord);
    return () =>
      window.removeEventListener("scsms-edit-record", handleEditRecord);
  }, []);

  // const toggleTheme = () => {
  //   setDark((value) => {
  //     const next = !value;
  //     localStorage.setItem("scsms-theme", next ? "dark" : "light");
  //     return next;
  //   });
  // };
  const toggleTheme = () => {
    const next = !dark;
    localStorage.setItem("scsms-theme", next ? "dark" : "light");
    setDarkOverride(next);
  };

  // const login = (user: SessionUser) => {
  //   saveSessionUser(user);
  //   setSessionUser(user);
  // };

  // const logout = () => {
  //   clearSessionUser();
  //   setSessionUser(null);
  // };
  const login = (user: SessionUser) => {
    saveSessionUser(user);
    setSessionOverride(user);
  };

  const logout = () => {
    clearSessionUser();
    setSessionOverride(null);
  };

  if (!sessionUser) {
    return (
      <>
        <LoginPage onLogin={login} />
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  return (
    <AcademicYearProvider>
      <div
        className={`app ${dark ? "dark-theme" : ""} ${mobileNavOpen ? "mobile-nav-open" : ""
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
            onClose={() => setEditDialog(null)}
          />
        )}
        <style jsx global>
          {globalStyles}
        </style>
      </div>
    </AcademicYearProvider>
  );
}
