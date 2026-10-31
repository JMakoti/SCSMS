"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { SyncProvider, type SyncState } from "@scsms/features/data/sync-context";

export function DesktopSyncProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SyncState>({ configured: false, syncing: false, lastSuccess: null, error: null });
  const syncNow = useCallback(() => {
    setStatus((current) => ({ ...current, syncing: true, error: null }));
    void invoke("sync_now").catch((error: unknown) => setStatus((current) => ({ ...current, syncing: false, error: String(error) })));
  }, []);

  useEffect(() => {
    let disposed = false;
    const subscriptions = [
      listen<SyncState>("scsms:sync-status", (event) => {
        if (disposed) return;
        setStatus(event.payload);
        if (!event.payload.syncing) window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      }),
      listen("scsms:sync-complete", () => {
        if (!disposed) window.dispatchEvent(new Event("scsms:feature-data-refresh"));
      }),
    ];
    void Promise.all(subscriptions).then(() => invoke<SyncState>("sync_status"))
      .then((value) => { if (!disposed) setStatus(value); })
      .catch(() => { if (!disposed) setStatus((current) => ({ ...current, error: "Desktop sync service is unavailable." })); });
    window.addEventListener("online", syncNow);
    return () => {
      disposed = true;
      window.removeEventListener("online", syncNow);
      for (const subscription of subscriptions) void subscription.then((unlisten) => unlisten()).catch(() => {});
    };
  }, [syncNow]);

  return <SyncProvider value={{ ...status, mode: "desktop", syncNow }}>{children}</SyncProvider>;
}
