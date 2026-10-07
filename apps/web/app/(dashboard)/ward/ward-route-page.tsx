"use client";

import { useRouter } from "next/navigation";
import { GenericPage } from "@scsms/features/pages/generic-page";
import { routeForModule } from "@scsms/features/navigation/route-for-module";
import { useFeatureData } from "@scsms/features/data/feature-data-context";
import type { AddWardFormValues } from "@scsms/features/types/forms";

export default function WardRoutePage() {
  const router = useRouter();
  const { wards } = useFeatureData();

  const saveWard = async (values: AddWardFormValues) => {
    const response = await fetch("/api/wards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "Unable to save the ward.",
      );
    }
  };

  return (
    <GenericPage
      active="Ward"
      setActive={() => undefined}
      onDetail={(item) => {
        const ward = wards.find((record) => record.name === item);
        router.push(
          `${routeForModule("Ward")}/${encodeURIComponent(ward?.id ?? item)}`,
        );
      }}
      wardRecords={wards}
      onSaveWard={saveWard}
    />
  );
}
