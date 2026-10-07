"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";
import { deleteWard, getWardByName, getWardDetails } from "@/repository/ward";
import type { WardDetails } from "@/repository/ward";

export default function WardDetailRoutePage({ item }: { item: string }) {
  const searchParams = useSearchParams();
  const wardId = searchParams.get("wardId");
  const recordKey = wardId ?? item;
  const [ward, setWard] = useState<WardDetails | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoaded(false);
    setWard(null);
    setLoadError("");
    (wardId
      ? getWardDetails(wardId)
      : getWardByName(recordKey).then((record) =>
          record ? getWardDetails(record.id) : null,
        ))
      .then((record) => {
        if (!cancelled) {
          setWard(record);
          setLoaded(true);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLoaded(true);
          setLoadError(
            error instanceof Error ? error.message : "Unable to load the ward.",
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [recordKey, wardId]);

  if (loadError || !loaded || !ward) {
    return (
      <div className="content" role={loadError ? "alert" : undefined}>
        {loadError ||
          (!loaded
            ? "Loading ward record..."
            : "This ward no longer exists. Refresh the list and try again.")}
      </div>
    );
  }

  return (
    <RecordDetailRoutePage
      active="Ward"
      item={ward.wardName}
      wardId={ward.id}
      wardDetail={{
        id: ward.id,
        name: ward.wardName,
        wardCode: ward.wardCode,
        county: ward.subCounty?.county ?? null,
        countyCode: ward.subCounty?.countyCode ?? null,
        subCounty: ward.subCounty?.subCounty ?? null,
        subCountyCode: ward.subCounty?.subCountyCode ?? null,
        constituency: ward.subCounty?.constituency ?? null,
        constituencyCode: ward.subCounty?.constituencyCode ?? null,
      }}
      wardCode={ward.wardCode}
      onDeleteWard={() => deleteWard(ward.id)}
    />
  );
}
