"use client";

import { useRouter } from "next/navigation";
import { RecordDetail } from "../pages/record-detail";
import { routeForModule } from "../navigation/route-for-module";

export function RecordDetailRoutePage({
  active,
  item,
}: {
  active: string;
  item: string;
}) {
  const router = useRouter();

  return (
    <RecordDetail
      active={active}
      item={item}
      onBack={() => router.push(routeForModule(active))}
    />
  );
}

export default RecordDetailRoutePage;
