"use client";

import { createContext, useContext } from "react";

export type UpdateStatus = "idle" | "checking" | "current" | "available" | "downloading" | "installing" | "installed" | "error";
export type UpdateHistoryEntry = { version: string; installedAt: string };
export type AppUpdater = {
  supported: boolean;
  status: UpdateStatus;
  currentVersion: string;
  availableVersion: string;
  releaseNotes: string;
  releaseDate: string;
  lastChecked: string;
  error: string;
  downloadedBytes: number;
  totalBytes: number | null;
  automaticChecks: boolean;
  pauseUntil: string;
  history: UpdateHistoryEntry[];
  check: () => Promise<void>;
  install: () => Promise<void>;
  restart: () => Promise<void>;
  setAutomaticChecks: (enabled: boolean) => void;
  setPauseUntil: (date: string) => void;
};

export const UpdateContext = createContext<AppUpdater | null>(null);
export const useAppUpdater = () => useContext(UpdateContext);
