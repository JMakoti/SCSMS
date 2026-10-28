"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { isTauri } from "@tauri-apps/api/core";
import { check, type Update } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";
import { UpdateContext, type UpdateStatus, type UpdateHistoryEntry } from "@scsms/features/updates/update-context";

const storageKey = "scsms:desktop-updates";
type StoredUpdates = {
  automaticChecks: boolean;
  pauseUntil: string;
  lastChecked: string;
  history: UpdateHistoryEntry[];
  pendingVersion: string;
};
const defaults: StoredUpdates = { automaticChecks: false, pauseUntil: "", lastChecked: "", history: [], pendingVersion: "" };

function readStored(): StoredUpdates {
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) ?? "{}");
    return {
      automaticChecks: value.automaticChecks === true,
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

  const persist = useCallback((changes: Partial<StoredUpdates>) => {
    const next = { ...storedRef.current, ...changes };
    storedRef.current = next;
    setStored(next);
    try { localStorage.setItem(storageKey, JSON.stringify(next)); }
    catch { /* Updating remains available when local storage is disabled. */ }
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isTauri() || busy.current) return;
    busy.current = true;
    setStatus("checking");
    setError("");
    try {
      if (pending.current) {
        await pending.current.close();
        pending.current = null;
      }
      setMetadata({ availableVersion: "", releaseNotes: "", releaseDate: "" });
      const update = await check({ timeout: 30000 });
      pending.current = update;
      persist({ lastChecked: new Date().toISOString() });
      if (update) {
        setMetadata({ availableVersion: update.version, releaseNotes: update.body ?? "", releaseDate: update.date ?? "" });
      }
      setStatus(update ? "available" : "current");
    } catch (cause) {
      setError(String(cause));
      setStatus("error");
    } finally { busy.current = false; }
  }, [persist]);

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
    const automaticCheck = () => {
      const preferences = storedRef.current;
      if (preferences.pauseUntil && new Date(`${preferences.pauseUntil}T00:00:00`).getTime() > Date.now()) return;
      if (pending.current) return;
      const last = Date.parse(preferences.lastChecked);
      if (!Number.isFinite(last) || Date.now() - last >= 24 * 60 * 60 * 1000) void checkForUpdates();
    };
    automaticCheck();
    const timer = window.setInterval(automaticCheck, 60 * 1000);
    return () => window.clearInterval(timer);
  }, [ready, stored.automaticChecks, stored.pauseUntil, checkForUpdates]);

  const install = async () => {
    const update = pending.current;
    if (!update || busy.current) return;
    busy.current = true;
    setError("");
    setDownloadedBytes(0);
    setTotalBytes(null);
    setStatus("downloading");
    try {
      await update.download((event) => {
        if (event.event === "Started") setTotalBytes(event.data.contentLength ?? null);
        if (event.event === "Progress") setDownloadedBytes((bytes) => bytes + event.data.chunkLength);
      }, { timeout: 30000 });
      // Windows exits during install. Confirm the version on the next launch before recording success.
      persist({ pendingVersion: update.version });
      setStatus("installing");
      await update.install();
      setStatus("installed");
      pending.current = null;
      await update.close().catch(() => {});
    } catch (cause) {
      persist({ pendingVersion: "" });
      setError(String(cause));
      setStatus("error");
    } finally { busy.current = false; }
  };

  return <UpdateContext.Provider value={{
    supported, status, currentVersion, ...metadata, error, downloadedBytes, totalBytes,
    ...stored, check: checkForUpdates, install,
    restart: async () => { try { await relaunch(); } catch (cause) { setError(String(cause)); } },
    setAutomaticChecks: (automaticChecks) => persist({ automaticChecks }),
    setPauseUntil: (pauseUntil) => persist({ pauseUntil }),
  }}>{children}</UpdateContext.Provider>;
}
