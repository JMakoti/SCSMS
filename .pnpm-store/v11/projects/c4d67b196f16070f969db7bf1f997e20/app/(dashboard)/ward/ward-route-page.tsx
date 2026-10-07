"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { GenericPage } from "@scsms/features/pages/generic-page";
import { routeForModule } from "@scsms/features/navigation/route-for-module";
import { useAcademicYear } from "@scsms/features/academic-years/academic-year-context";
import type { AddWardFormValues } from "@scsms/features/types/forms";
import { createWard, listWardSummaries } from "@/repository/ward";

export default function WardRoutePage() {
  const router = useRouter();
  const { currentAcademicYear } = useAcademicYear();
  const [wardSummaries, setWardSummaries] = useState<
    Awaited<ReturnType<typeof listWardSummaries>>
  >([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const refreshWards = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      setWardSummaries(await listWardSummaries(currentAcademicYear.id));
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Unable to load ward records.",
      );
    } finally {
      setLoading(false);
    }
  }, [currentAcademicYear.id]);

  useEffect(() => {
    let cancelled = false;
    listWardSummaries(currentAcademicYear.id)
      .then((records) => {
        if (!cancelled) setWardSummaries(records);
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Unable to load ward records.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentAcademicYear.id]);

  const saveWard = async (values: AddWardFormValues) => {
    await createWard(values);
    await refreshWards();
  };

  return (
    <GenericPage
      active="Ward"
      setActive={() => undefined}
      onDetail={(item) => {
        const ward = wardSummaries.find((record) => record.name === item);
        const wardId = ward?.id ?? item;
        router.push(
          `${routeForModule("Ward")}/overview?wardId=${encodeURIComponent(wardId)}`,
        );
      }}
      wardRecords={wardSummaries}
      onSaveWard={saveWard}
      wardLoading={loading}
      wardLoadError={loadError}
    />
  );
}
