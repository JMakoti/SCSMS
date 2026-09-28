"use client";

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "Active" || status === "Completed"
      ? "status-active"
      : status === "Update needed" || status === "Pending"
        ? "status-warning"
        : "status-muted";
  return (
    <span className={`status-badge ${cls}`}>
      <span className="status-dot" />
      {status}
    </span>
  );
}

export default StatusBadge;
