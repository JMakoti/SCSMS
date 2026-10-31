"use client";

import { Button } from "@scsms/ui/components/button";
import { Cloud, MoreHorizontal, RefreshCw } from "lucide-react";
import { useFeatureData } from "../data/feature-data-context";
import { useSyncState } from "../data/sync-context";
import { useSyncExternalStore } from "react";
import PageHeader from "../ui/page-header";
const subscribeOnline = (callback: () => void) => {
  window.addEventListener("online", callback);
  window.addEventListener("offline", callback);
  return () => { window.removeEventListener("online", callback); window.removeEventListener("offline", callback); };
};
export function SyncPage() {
  const sync = useSyncState();
  const desktop = sync?.mode === "desktop";
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const syncNow = () => sync ? sync.syncNow() : window.dispatchEvent(new Event("scsms:feature-data-refresh"));
  const { pendingSyncCount, syncRecords } = useFeatureData();
  const failedRecords = syncRecords.filter((record) => record.status === "failed");
  const syncedRecords = syncRecords.filter((record) => record.status === "synced");
  const lastSuccessfulSync = syncedRecords
    .map((record) => record.syncedAt)
    .filter((date): date is string => Boolean(date))
    .sort((a, b) => b.localeCompare(a))[0];
  const queuedRecords = [...syncRecords]
    .filter((record) => ["pending", "failed", "syncing"].includes(record.status))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const formatDate = (value: string | null) =>
    value ? new Date(value).toLocaleString() : "Not available";

  return (
    <div className="content">
      <PageHeader
        title="Synchronization Center"
        description="Monitor local changes and synchronize securely with the central database"
        eyebrow="Administration / Synchronization"
        action={
          <Button onClick={syncNow} disabled={!online || Boolean(sync?.syncing)}>
            <RefreshCw data-icon="inline-start" className={sync?.syncing ? "animate-spin" : undefined} />
            {sync?.syncing ? desktop ? "Syncing…" : "Refreshing…" : desktop ? "Sync Now" : "Refresh cloud data"}
          </Button>
        }
      />
      <div className="sync-hero">
        <div className="sync-orb">
          <RefreshCw />
        </div>
        <div>
          <span className="eyebrow">Connection status</span>
          <h2>{!online ? desktop ? "Offline — changes stay on this device" : "Offline — reconnect to access cloud data" : desktop ? !sync.configured ? "Cloud sync is not configured" : sync.syncing ? "Synchronizing with cloud" : sync.error ? "Waiting to retry" : "Automatic cloud sync enabled" : sync?.syncing ? "Refreshing cloud data" : "Connected to cloud PostgreSQL"}</h2>
          <p role="status" aria-live="polite">{desktop ? "Last successful sync" : "Last cloud refresh"}: {sync?.lastSuccess ? new Date(Number(sync.lastSuccess)).toLocaleString() : formatDate(lastSuccessfulSync ?? null)}</p>
          {sync?.error && <p role="status">{sync.error}</p>}
          <p>{desktop ? sync.configured ? "Changes upload and download automatically while this application is open." : "Start desktop development with pnpm dev:desktop to load your root sync settings, or configure the installed application's sync.json." : "Cloud records refresh automatically every 15 seconds. Desktop applications upload and download changes while they are open."}</p>
        </div>
        <div className="sync-metrics">
          <div>
            <strong>{pendingSyncCount}</strong>
            <span>Pending changes</span>
          </div>
          <div>
            <strong>{syncedRecords.length}</strong>
            <span>Records synced</span>
          </div>
          <div>
            <strong>{failedRecords.length}</strong>
            <span>Failed records</span>
          </div>
        </div>
      </div>
      <div className="panel sync-table">
        <div className="panel-header">
          <div>
            <h2>Sync queue</h2>
            <p>Local changes waiting to be processed</p>
          </div>
          <button className="outline-button" onClick={syncNow} disabled={!online || failedRecords.length === 0 || Boolean(sync?.syncing)}>
            Retry failed
          </button>
        </div>
        {queuedRecords.map((record) => (
          <div className="sync-row" key={record.id}>
            <div className="sync-row-icon">
              <Cloud />
            </div>
            <div>
              <strong>{record.label}</strong>
              <span>{record.operation} · {record.tableName}</span>
              {record.lastError && <span role="status">{record.lastError}</span>}
            </div>
            <span className={`sync-status ${record.status === "failed" ? "failed" : "pending"}`}>
              {record.status}
            </span>
            <span className="sync-time">{formatDate(record.createdAt)}</span>
            <button className="row-more">
              <MoreHorizontal />
            </button>
          </div>
        ))}
        {queuedRecords.length === 0 && (
          <div className="sync-row">
            <div className="sync-row-icon">
              <Cloud />
            </div>
            <div>
              <strong>No queued changes</strong>
              <span>There are no pending or failed synchronization records.</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default SyncPage;
