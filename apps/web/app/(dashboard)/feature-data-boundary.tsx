"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AcademicYearProvider } from "@scsms/features/academic-years/academic-year-context";
import {
  FeatureDataProvider,
  isFeatureData,
  type FeatureData,
} from "@scsms/features/data/feature-data-context";
import { SyncProvider } from "@scsms/features/data/sync-context";

export function FeatureDataBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<FeatureData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<string | null>(null);

  useEffect(() => {
    const refreshFeatureData = () => {
      setRefreshing(true);
      setReloadKey((key) => key + 1);
    };
    const timer = window.setInterval(() => {
      if (navigator.onLine && document.visibilityState === "visible") refreshFeatureData();
    }, 15_000);
    window.addEventListener("online", refreshFeatureData);
    window.addEventListener("scsms:feature-data-refresh", refreshFeatureData);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", refreshFeatureData);
      window.removeEventListener(
        "scsms:feature-data-refresh",
        refreshFeatureData,
      );
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/feature-data", { cache: "no-store" })
      .then(async (response) => {
        const payload: unknown = await response.json();
        if (!response.ok) {
          throw new Error(
            payload &&
              typeof payload === "object" &&
              "error" in payload &&
              typeof payload.error === "string"
              ? payload.error
              : "Database records could not be loaded.",
          );
        }
        if (!isFeatureData(payload)) {
          throw new Error("The database records response was invalid.");
        }
        return payload;
      })
      .then((featureData) => {
        if (!cancelled) {
          setData(featureData);
          setError("");
          setLastRefresh(String(Date.now()));
        }
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Database records could not be loaded.",
        );
      }).finally(() => { if (!cancelled) setRefreshing(false); });

    return () => {
      cancelled = true;
    };
  }, [pathname, reloadKey]);

  if (error) {
    return (
      <main className="auth-page">
        <section className="login-card">
          <h1>Database records unavailable</h1>
          <p role="alert">{error}</p>
          <button
            className="modal-primary-button"
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </button>
        </section>
      </main>
    );
  }

  if (!data) {
    return (
      <main className="auth-page">
        <section className="login-card">
          <p>Loading records from the database...</p>
        </section>
      </main>
    );
  }

  return (
    <SyncProvider value={{ mode: "cloud", configured: true, syncing: refreshing, lastSuccess: lastRefresh, error: error || null,
      syncNow: () => window.dispatchEvent(new Event("scsms:feature-data-refresh")) }}>
    <FeatureDataProvider data={data}>
      <AcademicYearProvider
        initialAcademicYears={data.academicYears}
        initialCurrentAcademicYearId={
          data.academicYears.find((year) => year.isActive)?.id ??
          data.academicYears[0]?.id
        }
      >
        {children}
      </AcademicYearProvider>
    </FeatureDataProvider>
    </SyncProvider>
  );
}
