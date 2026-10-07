"use client";

import { useFeatureData } from "@scsms/features/data/feature-data-context";
import RecordDetailRoutePage from "@scsms/features/pages/record-detail-route-page";

export default function WardDetailRoutePage({ item }: { item: string }) {
  const { wards, subCounties } = useFeatureData();
  const ward = wards.find(
    (record) =>
      record.id === item || record.name === item || record.wardCode === item,
  );

  if (!ward) {
    return (
      <div className="content">
        This ward no longer exists. Refresh the list and try again.
      </div>
    );
  }
  const subCounty = subCounties.find(
    (record) => record.id === ward.subCountyId,
  );

  const deleteWard = async () => {
    const response = await fetch(`/api/wards/${encodeURIComponent(ward.id)}`, {
      method: "DELETE",
    });
    const result: unknown = await response.json();
    if (!response.ok) {
      throw new Error(
        result &&
          typeof result === "object" &&
          "error" in result &&
          typeof result.error === "string"
          ? result.error
          : "Unable to delete the ward.",
      );
    }
    window.dispatchEvent(new Event("scsms:feature-data-refresh"));
  };

  return (
    <RecordDetailRoutePage
      active="Ward"
      item={ward.name}
      wardId={ward.id}
      wardDetail={{
        id: ward.id,
        name: ward.name,
        wardCode: ward.wardCode,
        county: subCounty?.county ?? ward.county,
        countyCode: subCounty?.countyCode ?? ward.countyCode,
        subCounty: subCounty?.subCounty ?? ward.subCounty,
        subCountyCode: subCounty?.subCountyCode ?? ward.subCountyCode,
        constituency: subCounty?.constituency ?? ward.constituency,
        constituencyCode:
          subCounty?.constituencyCode ?? ward.constituencyCode,
      }}
      wardCode={ward.wardCode ?? undefined}
      onDeleteWard={deleteWard}
    />
  );
}
