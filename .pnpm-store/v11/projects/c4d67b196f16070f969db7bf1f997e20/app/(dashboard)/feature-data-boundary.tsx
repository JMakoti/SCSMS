"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AcademicYearProvider } from "@scsms/features/academic-years/academic-year-context";
import {
  FeatureDataProvider,
  type FeatureData,
} from "@scsms/features/data/feature-data-context";
import { loadDesktopFeatureData } from "@/lib/feature-data";

export function FeatureDataBoundary({
  children,
  userEmail,
  onLogout,
  onSetCurrentAcademicYear,
  onTransitionAcademicYear,
}: {
  children: ReactNode;
  userEmail: string;
  onLogout: () => void;
} & Pick<
  ComponentProps<typeof AcademicYearProvider>,
  "onSetCurrentAcademicYear" | "onTransitionAcademicYear"
>) {
  const pathname = usePathname();
  const [data, setData] = useState<FeatureData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const refreshFeatureData = () => setReloadKey((key) => key + 1);
    window.addEventListener("scsms:feature-data-refresh", refreshFeatureData);
    window.addEventListener("scsms:academic-years-refresh", refreshFeatureData);
    return () => {
      window.removeEventListener(
        "scsms:feature-data-refresh",
        refreshFeatureData,
      );
      window.removeEventListener("scsms:academic-years-refresh", refreshFeatureData);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let retryDelay = 1_000;

    const load = async () => {
      try {
        const featureData = await loadDesktopFeatureData(userEmail);
        if (cancelled) return;
        setData(featureData);
        setError("");
      } catch (loadError) {
        if (cancelled) return;
        console.error("Failed to load desktop records", loadError);
        setError(
          "School records could not be loaded. Retrying in the background.",
        );
        retryTimer = setTimeout(() => void load(), retryDelay);
        retryDelay = Math.min(retryDelay * 2, 30_000);
      }
    };

    void load();

    return () => {
      cancelled = true;
      clearTimeout(retryTimer);
    };
  }, [pathname, reloadKey, userEmail]);

  if (!data) {
    return (
      <main className="auth-page">
        <section className="login-card">
          <p role="status">
            {error || "Preparing your school records..."}
          </p>
          {error && (
            <button
              className="modal-primary-button"
              type="button"
              onClick={() => setReloadKey((key) => key + 1)}
            >
              Retry now
            </button>
          )}
          <button className="outline-button" type="button" onClick={onLogout}>
            Back to sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <FeatureDataProvider data={data}>
      <AcademicYearProvider
        initialAcademicYears={data.academicYears}
        initialCurrentAcademicYearId={
          data.academicYears.find((year) => year.isActive)?.id ??
          data.academicYears[0]?.id
        }
        onSetCurrentAcademicYear={onSetCurrentAcademicYear}
        onTransitionAcademicYear={onTransitionAcademicYear}
      >
        {error && (
          <p role="status">
            School records could not be refreshed. Retrying in the background.
          </p>
        )}
        {children}
      </AcademicYearProvider>
    </FeatureDataProvider>
  );
}
