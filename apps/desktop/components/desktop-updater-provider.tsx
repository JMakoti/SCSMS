"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { UpdateContext, type UpdateStatus, type UpdateHistoryEntry } from "@scsms/features/updates/update-context";

const storageKey = "scsms:desktop-updates";
type StoredUpdates = {
  preferencesVersion: number;
  automaticChecks: boolean;
  pauseUntil: string;
  lastChecked: string;
  history: UpdateHistoryEntry[];
  pendingVersion: string;
};
const defaults: StoredUpdates = { preferencesVersion: 1, automaticChecks: true, pauseUntil: "", lastChecked: "", history: [], pendingVersion: "" };
const checkInterval = 60 * 60 * 1000;
const retryInterval = 5 * 60 * 1000;

function isPaused(preferences: StoredUpdates) {
  return Boolean(preferences.pauseUntil && new Date(`${preferences.pauseUntil}T00:00:00`).getTime() > Date.now());
}

function readStored(): StoredUpdates {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    return {
      preferencesVersion: 1,
      // Enable the new automatic flow for installations with the old opt-in default.
      automaticChecks: value.preferencesVersion === 1 ? value.automaticChecks !== false : true,
      pauseUntil: typeof value.pauseUntil === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value.pauseUntil) ? value.pauseUntil : "",
      lastChecked: typeof value.lastChecked === "string" ? value.lastChecked : "",
      pendingVersion: typeof value.pendingVersion === "string" ? value.pendingVersion : "",
      history: Array.isArray(value.history) ? value.history.filter((item: UpdateHistoryEntry) => item && typeof item.version === "string" && typeof item.installedAt === "string").slice(0, 20) : [],
    };
  } catch { return { ...defaults }; }
}

export function DesktopUpdaterProvider({ children }: { children: ReactNode }) {
  const [supported, setSupported] = useState(false);
  const [ready, setReady] = useState(false);
  const [stored, setStored] = useState<StoredUpdates>(defaults);
  const storedRef = useRef(stored);
  const [status, setStatus] = useState<UpdateStatus>("idle");
  const [currentVersion, setCurrentVersion] = useState("");
  const [metadata, setMetadata] = useState({ availableVersion: "", releaseNotes: "", releaseDate: "" });
  const [error, setError] = useState("");
  const [downloadedBytes, setDownloadedBytes] = useState(0);
  const [totalBytes, setTotalBytes] = useState<number | null>(null);
  const pending = useRef<Update | null>(null);
  const busy = useRef(false);
  const installed = useRef(false);
  const nextAutomaticCheck = useRef(0);

  const persist = useCallback((changes: Partial<StoredUpdates>) => {
    const next = { ...storedRef.current, ...changes };
    storedRef.current = next;
    setStored(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { /* Updating remains available when local storage is disabled. */ }
  }, []);

  const installUpdate = useCallback(async (update: Update, automatic: boolean) => {
    setError("");
    setDownloadedBytes(0);
    setTotalBytes(null);
    setStatus("downloading");
    try {
      await update.download((event) => {
        if (event.event === "Started") setTotalBytes(event.data.contentLength ?? null);
        if (event.event === "Progress") setDownloadedBytes((bytes) => bytes + event.data.chunkLength);
      }, { timeout: 30000 });
      // Windows exits during install. Confirm the running version on the next launch.
      persist({ pendingVersion: update.version });
      setStatus("installing");
      await update.install({ restartAfterInstall: true });
    } catch (cause) {
      persist({ pendingVersion: "" });
      setError(String(cause));
      setStatus("error");
      nextAutomaticCheck.current = Date.now() + retryInterval;
      return;
    }
    installed.current = true;
    setStatus("installed");
    pending.current = null;
    await update.close().catch(() => {});
    // Windows restarts through its installer; other platforms return here.
    if (automatic) {
      try { await relaunch(); }
      catch (cause) { setError(String(cause)); }
    }
  }, [persist]);

  const install = useCallback(async () => {
    const update = pending.current;
    if (!isTauri() || !update || busy.current || installed.current) return;
    busy.current = true;
    try { await installUpdate(update, false); }
    finally { busy.current = false; }
  }, [installUpdate]);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri() || busy.current || installed.current) return;
    busy.current = true;
    setStatus("checking");
    setError("");
    try {
      if (pending.current) {
        await pending.current.close().catch(() => {});
        pending.current = null;
      }
      setMetadata({ availableVersion: "", releaseNotes: "", releaseDate: "" });
      const update = await check({ timeout: 30000 });
      pending.current = update;
      persist({ lastChecked: new Date().toISOString() });
      nextAutomaticCheck.current = Date.now() + checkInterval;
      if (update) {
        setMetadata({ availableVersion: update.version, releaseNotes: update.body ?? "", releaseDate: update.date ?? "" });
      }
      setStatus(update ? "available" : "current");
      const preferences = storedRef.current;
      if (update && preferences.automaticChecks && !isPaused(preferences)) {
        await installUpdate(update, true);
      }
    } catch (cause) {
      setError(String(cause));
      setStatus("error");
      nextAutomaticCheck.current = Date.now() + retryInterval;
    } finally { busy.current = false; }
  }, [persist, installUpdate]);

  useEffect(() => {
    if (!isTauri()) return;
    let cancelled = false;
    void getVersion().then((version) => {
      if (cancelled) return;
      const saved = readStored();
      if (saved.pendingVersion === version) {
        saved.history = [{ version, installedAt: new Date().toISOString() }, ...saved.history].slice(0, 20);
        saved.pendingVersion = "";
      }
      persist(saved);
      setCurrentVersion(version);
      setSupported(true);
      setReady(true);
    }).catch((cause) => {
      if (!cancelled) { setError(String(cause)); setStatus("error"); }
    });
    return () => {
      cancelled = true;
      if (!busy.current && pending.current) {
        void pending.current.close().catch(() => {});
        pending.current = null;
      }
    };
  }, [persist]);

  useEffect(() => {
    if (!ready || !stored.automaticChecks) return;
    nextAutomaticCheck.current = 0;
    const automaticCheck = () => {
      const preferences = storedRef.current;
      if (!preferences.automaticChecks || isPaused(preferences) || navigator.onLine === false) return;
      if (Date.now() >= nextAutomaticCheck.current) void checkForUpdates();
    };
    const onOnline = () => {
      nextAutomaticCheck.current = 0;
      automaticCheck();
    };
    automaticCheck();
    const timer = window.setInterval(automaticCheck, 60 * 1000);
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
    };
  }, [ready, stored.automaticChecks, stored.pauseUntil, checkForUpdates]);

  return <UpdateContext.Provider value={{
    supported, status, currentVersion, ...metadata, error, downloadedBytes, totalBytes,
    ...stored, check: checkForUpdates, install,
    restart: async () => { try { await relaunch(); } catch (cause) { setError(String(cause)); } },
    setAutomaticChecks: (automaticChecks) => persist({ automaticChecks }),
    setPauseUntil: (pauseUntil) => persist({ pauseUntil }),
  }}>{children}</UpdateContext.Provider>;
}
