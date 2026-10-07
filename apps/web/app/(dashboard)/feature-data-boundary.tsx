"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { AcademicYearProvider } from "@scsms/features/academic-years/academic-year-context";
import {
  FeatureDataProvider,
  isFeatureData,
  type FeatureData,
} from "@scsms/features/data/feature-data-context";

export function FeatureDataBoundary({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [data, setData] = useState<FeatureData | null>(null);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    const refreshFeatureData = () => setReloadKey((key) => key + 1);
    window.addEventListener("scsms:feature-data-refresh", refreshFeatureData);
    return () =>
      window.removeEventListener(
        "scsms:feature-data-refresh",
        refreshFeatureData,
      );
  }, []);

  useEffect(() => {
    let cancelled = false;
    setError("");

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
        if (!cancelled) setData(featureData);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Database records could not be loaded.",
        );
      });

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
  );
}
