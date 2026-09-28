"use client";

import { Button } from "@scsms/ui/components/button";
import { Cloud, MoreHorizontal, RefreshCw } from "lucide-react";
import PageHeader from "../ui/page-header";
export function SyncPage() {
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
          <h2>Online and ready</h2>
          <p>Last successful sync: 18 September 2026, 02:00 AM</p>
        </div>
        <div className="sync-metrics">
          <div>
            <strong>7</strong>
            <span>Pending changes</span>
          </div>
          <div>
            <strong>126</strong>
            <span>Records synced</span>
          </div>
          <div>
            <strong>2</strong>
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
          <button className="outline-button">Retry failed</button>
        </div>
        {[
          "School SCH-001",
          "Enrollment • Mwangaza Primary",
          "Staff STF-012",
          "Infrastructure • Bahari Primary",
        ].map((x, i) => (
          <div className="sync-row" key={x}>
            <div className="sync-row-icon">
              <Cloud />
            </div>
            <div>
              <strong>{x}</strong>
              <span>
                {i === 0
                  ? "Updated status field"
                  : i === 1
                    ? "Added Grade 4 enrollment"
                    : "Record updated locally"}
              </span>
            </div>
            <span className={`sync-status ${i === 3 ? "failed" : "pending"}`}>
              {i === 3 ? "Failed" : "Pending"}
            </span>
            <span className="sync-time">{i + 1}h ago</span>
            <button className="row-more">
              <MoreHorizontal />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default SyncPage;
