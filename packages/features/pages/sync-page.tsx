"use client";

import { Button } from "@scsms/ui/components/button";
import { Cloud, MoreHorizontal, RefreshCw } from "lucide-react";
import { useFeatureData } from "../data/feature-data-context";
import PageHeader from "../ui/page-header";
export function SyncPage() {
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
          <Button>
            <RefreshCw data-icon="inline-start" />
            Sync Now
          </Button>
        }
      />
      <div className="sync-hero">
        <div className="sync-orb">
          <RefreshCw />
        </div>
        <div>
          <span className="eyebrow">Connection status</span>
          <h2>Database connection active</h2>
          <p>Last successful sync: {formatDate(lastSuccessfulSync ?? null)}</p>
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
          <button className="outline-button" disabled={failedRecords.length === 0}>
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
