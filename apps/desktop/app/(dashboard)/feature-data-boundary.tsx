"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import {
  FeatureDataProvider,
  type FeatureData,
} from "@scsms/features/data/feature-data-context";
import { loadDesktopFeatureData } from "@/lib/feature-data";

export function FeatureDataBoundary({
  children,
  userEmail,
}: {
  children: ReactNode;
  userEmail: string;
}) {
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

    loadDesktopFeatureData(userEmail)
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
  }, [pathname, reloadKey, userEmail]);

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
          <p>Loading records from the local database...</p>
        </section>
      </main>
    );
  }

  return <FeatureDataProvider data={data}>{children}</FeatureDataProvider>;
}
