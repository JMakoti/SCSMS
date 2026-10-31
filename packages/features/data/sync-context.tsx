"use client";

import { createContext, useContext, type ReactNode } from "react";

export type SyncState = {
  configured: boolean;
  syncing: boolean;
  lastSuccess: string | null;
  error: string | null;
};

type SyncContextValue = SyncState & { mode: "desktop" | "cloud"; syncNow: () => void };
const SyncContext = createContext<SyncContextValue | null>(null);

export function SyncProvider({ children, value }: {
  children: ReactNode;
  value: SyncContextValue;
}) {
  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSyncState() { return useContext(SyncContext); }
