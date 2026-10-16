"use client";

import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { FeatureDataBoundary } from "./feature-data-boundary";
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
  type SessionUser,
} from "../session-user";
import {
  closeAcademicYear,
  createAcademicYear,
  setCurrentAcademicYear,
} from "@/repository/academic-year";
import { loginWithLocalAccount, logoutLocalAccount } from "@/repository/auth";
import {
  createSchool,
  updateSchool,
} from "@/repository/school";
import { saveInfrastructureFacility } from "@/repository/infrastructure";
import { updateStaffMember } from "@/repository/staff";
import { chooseSchoolLogoFile } from "@/lib/choose-school-logo-file";
import { getWardByName, updateWard } from "@/repository/ward";

type EditDialogState = {
  active: string;
  item: string;
  schoolId?: string;
  wardCode?: string;
  wardId?: string;
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
  const [sessionUser, setSessionUser] = useState<SessionUser | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNavPath, setMobileNavPath] = useState<string | null>(null);
  const [dialog, setDialog] = useState<string | null>(null);
  const [editDialog, setEditDialog] = useState<EditDialogState | null>(null);
  const [darkOverride, setDarkOverride] = useState<boolean | null>(null);
  const sessionKey = sessionUser?.id ?? sessionUser?.email ?? null;
  const dark =
    darkOverride ??
    (hydrated && localStorage.getItem("scsms-theme") === "dark");
  const mobileNavOpen = mobileNavPath === pathname;

  useEffect(() => {
    clearSessionUser();
    void logoutLocalAccount().catch((error) => console.error("Failed to clear desktop session", error));
  }, []);

  useEffect(() => {
    const handleKeyboardShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setDialog((current) => current ?? "search");
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
        schoolId: detail.schoolId,
        wardCode: detail.wardCode,
        wardId: detail.wardId,
      });
    };

    window.addEventListener("scsms-edit-record", handleEditRecord);
    return () =>
      window.removeEventListener("scsms-edit-record", handleEditRecord);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    localStorage.setItem("scsms-theme", next ? "dark" : "light");
    setDarkOverride(next);
  };

  const login = (user: SessionUser) => {
    setSessionUser(user);
  };

  const logout = () => {
    void logoutLocalAccount().catch((error) => console.error("Failed to clear desktop session", error));
    clearSessionUser();
    setSessionUser(null);
  };

  useEffect(() => {
    const updateAccount = (event: Event) => {
      const profile = (event as CustomEvent<{ name: string; email: string }>).detail;
      setSessionUser((current) => current ? { ...current, name: profile.name, email: profile.email } : null);
    };
    window.addEventListener("scsms:account-updated", updateAccount);
    return () => window.removeEventListener("scsms:account-updated", updateAccount);
  }, []);

  const persistAcademicYearTransition = async ({
    closingYear,
    newYear,
  }: {
    closingYear: { id: string } | null;
    newYear: {
      id: string;
      name: string;
      startDate: string;
      endDate: string;
    };
  }) => {
    if (closingYear) {
      await closeAcademicYear(closingYear.id);
    }

    await createAcademicYear({
      id: newYear.id,
      name: newYear.name,
      startsOn: newYear.startDate,
      endsOn: newYear.endDate,
      status: "active",
      isCurrent: true,
    });
  };

  if (!sessionUser) {
    return (
      <>
        <LoginPage authenticate={loginWithLocalAccount} onLogin={login} />
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  return (
    <FeatureDataBoundary
      key={sessionKey}
      userEmail={sessionUser.email}
      onSetCurrentAcademicYear={setCurrentAcademicYear}
      onTransitionAcademicYear={persistAcademicYearTransition}
    >
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
            onMenu={() => setMobileNavPath(pathname)}
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
          <AddSchoolDialog
            onClose={() => setDialog(null)}
            onSave={createSchool}
            onChooseFile={chooseSchoolLogoFile}
          />
        )}
        {editDialog && (
          <EditRecordDialog
            active={editDialog.active}
            item={editDialog.item}
            schoolId={editDialog.schoolId}
            wardId={editDialog.wardId}
            wardCode={editDialog.wardCode}
            onClose={() => setEditDialog(null)}
            onSaveSchool={updateSchool}
            onSaveStaff={updateStaffMember}
            onSaveInfrastructureFacility={saveInfrastructureFacility}
            onChooseFile={chooseSchoolLogoFile}
            onSaveWard={
              editDialog.active === "Ward"
                ? async (values) => {
                    const ward =
                      editDialog.wardId == null
                        ? await getWardByName(editDialog.item)
                        : null;
                    const wardId = editDialog.wardId ?? ward?.id;
                    if (!wardId) {
                      throw new Error(
                        "The ward could not be identified in the database. Close the editor, refresh the ward list, and try again.",
                      );
                    }
                    await updateWard(wardId, values);
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
