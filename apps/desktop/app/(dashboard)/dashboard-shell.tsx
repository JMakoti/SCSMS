"use client";

import { usePathname, useRouter } from "next/navigation";
// import { type ReactNode, useEffect, useState } from "react";
import { type ReactNode, useEffect, useState, useSyncExternalStore } from "react";
import { AcademicYearProvider } from "@scsms/features/academic-years/academic-year-context";
import { FeatureDataBoundary } from "./feature-data-boundary";
import { LoginPage } from "@scsms/features/auth/login-page";
import { EditRecordDialog } from "@scsms/features/dialogs/edit-record-dialog";
import { AddSchoolDialog } from "@scsms/features/dialogs/school-dialogs";
import { SearchDialog } from "@scsms/features/dialogs/search-dialog";
import Sidebar from "@scsms/features/navigation/sidebar";
import Topbar from "@scsms/features/navigation/topbar";
import { routeForModule } from "@scsms/features/navigation/route-for-module";
import type { AcademicYear } from "@scsms/features/types/enterprise";
import { globalStyles } from "@scsms/ui/styles/app-styles";
import {
  clearSessionUser,
  readSessionUser,
  saveSessionUser,
  type SessionUser,
} from "../session-user";
import {
  closeAcademicYear,
  createAcademicYear,
  listAcademicYears,
  setCurrentAcademicYear,
  type AcademicYearRecord,
} from "@/repository/academic-year";
import { loginWithLocalAccount } from "@/repository/auth";
import {
  createSchool,
  updateSchool,
} from "@/repository/school";
import { chooseSchoolLogoFile } from "@/lib/choose-school-logo-file";
import { getWardByName, updateWard } from "@/repository/ward";

type EditDialogState = {
  active: string;
  item: string;
  schoolId?: string;
  wardCode?: string;
  wardId?: string;
};

function mapAcademicYear(record: AcademicYearRecord) {
  return {
    id: record.id,
    name: record.name,
    startDate: record.startsOn,
    endDate: record.endsOn,
    isActive: record.isCurrent || record.status === "active",
    isClosed: record.status === "closed" || record.status === "archived",
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  } satisfies AcademicYear;
}

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
  const [academicYears, setAcademicYears] = useState<AcademicYear[] | null>(
    null,
  );
  const [academicYearError, setAcademicYearError] = useState("");
  const [academicYearReloadKey, setAcademicYearReloadKey] = useState(0);
  const sessionUser =
    sessionOverride === undefined
      ? hydrated
        ? readSessionUser()
        : null
      : sessionOverride;
  const sessionKey = sessionUser?.id ?? sessionUser?.email ?? null;
  const dark =
    darkOverride ??
    (hydrated && localStorage.getItem("scsms-theme") === "dark");
  const mobileNavOpen = mobileNavPath === pathname;

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
        schoolId: detail.schoolId,
        wardCode: detail.wardCode,
        wardId: detail.wardId,
      });
    };

    window.addEventListener("scsms-edit-record", handleEditRecord);
    return () =>
      window.removeEventListener("scsms-edit-record", handleEditRecord);
  }, []);

  useEffect(() => {
    if (!sessionKey) return;

    let cancelled = false;

    listAcademicYears()
      .then((records) => {
        if (cancelled) return;

        setAcademicYears(records.map(mapAcademicYear));
        setAcademicYearError("");
      })
      .catch((error) => {
        if (cancelled) return;

        setAcademicYearError(
          error instanceof Error
            ? error.message
            : "Academic years could not be loaded from the local database.",
        );
        setAcademicYears([]);
      });

    return () => {
      cancelled = true;
    };
  }, [sessionKey, academicYearReloadKey]);

  useEffect(() => {
    const refreshAcademicYears = () =>
      setAcademicYearReloadKey((key) => key + 1);
    window.addEventListener(
      "scsms:academic-years-refresh",
      refreshAcademicYears,
    );
    return () =>
      window.removeEventListener(
        "scsms:academic-years-refresh",
        refreshAcademicYears,
      );
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    localStorage.setItem("scsms-theme", next ? "dark" : "light");
    setDarkOverride(next);
  };

  const login = (user: SessionUser) => {
    saveSessionUser(user);
    setAcademicYears(null);
    setAcademicYearError("");
    setSessionOverride(user);
  };

  const logout = () => {
    clearSessionUser();
    setAcademicYears(null);
    setAcademicYearError("");
    setSessionOverride(null);
  };

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

  if (academicYears === null) {
    return (
      <>
        <main className="auth-page">
          <section className="login-card">
            <p>Loading academic years...</p>
          </section>
        </main>
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  if (academicYearError) {
    return (
      <>
        <main className="auth-page">
          <section className="login-card">
            <h1>Academic years unavailable</h1>
            <p>{academicYearError}</p>
            <button
              className="modal-primary-button"
              type="button"
              onClick={() => {
                setAcademicYears(null);
                setAcademicYearError("");
                setAcademicYearReloadKey((value) => value + 1);
              }}
            >
              Retry
            </button>
          </section>
        </main>
        <style jsx global>
          {globalStyles}
        </style>
      </>
    );
  }

  return (
    <AcademicYearProvider
      initialAcademicYears={academicYears}
      initialCurrentAcademicYearId={
        academicYears.find((year) => year.isActive)?.id ?? academicYears[0]?.id
      }
      onSetCurrentAcademicYear={setCurrentAcademicYear}
      onTransitionAcademicYear={persistAcademicYearTransition}
    >
      <FeatureDataBoundary userEmail={sessionUser.email}>
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
    </AcademicYearProvider>
  );
}
