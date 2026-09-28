"use client";

import { useRouter } from "next/navigation";
import { GenericPage } from "../pages/generic-page";
import { routeForModule } from "../navigation/route-for-module";

export function ModuleRoutePage({ active }: { active: string }) {
  const router = useRouter();

  return (
    <GenericPage
      active={active}
      setActive={() => undefined}
      onDetail={(item) =>
        router.push(`${routeForModule(active)}/${encodeURIComponent(item)}`)
      }
    />
  );
}

export default ModuleRoutePage;
