"use client";

import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { GenericPage } from "../pages/generic-page";
import { routeForModule } from "../navigation/route-for-module";
import { RecordDetail } from "./record-detail";
import type { InfrastructureFacilitySaveInput } from "../schemas/infrastructure-facility-schema";

export function ModuleRoutePage({
  active,
  onSaveInfrastructureFacility,
}: {
  active: string;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
  return (
    <Suspense fallback={null}>
      <ModuleRoutePageContent
        active={active}
        onSaveInfrastructureFacility={onSaveInfrastructureFacility}
      />
    </Suspense>
  );
}

function ModuleRoutePageContent({
  active,
  onSaveInfrastructureFacility,
}: {
  active: string;
  onSaveInfrastructureFacility?: (
    input: InfrastructureFacilitySaveInput,
  ) => Promise<void>;
}) {
  const router = useRouter();
  const item = useSearchParams().get("item");

  if (item) {
    return (
      <RecordDetail
        active={active}
        item={item}
        onBack={() => router.push(routeForModule(active))}
        onSaveInfrastructureFacility={onSaveInfrastructureFacility}
      />
    );
  }

  return (
    <GenericPage
      active={active}
      setActive={() => undefined}
      onDetail={(selectedItem) =>
        router.push(
          `${routeForModule(active)}?item=${encodeURIComponent(selectedItem)}`,
        )
      }
    />
  );
}

export default ModuleRoutePage;
