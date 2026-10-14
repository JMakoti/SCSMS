"use client";

import { useEffect, useId, useState } from "react";
import { CalendarDays, ChevronRight, Download, History, Megaphone, Pause, RotateCw } from "lucide-react";
import { useAppUpdater, type UpdateStatus } from "./update-context";

function displayDate(value: string, dateOnly = false) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return dateOnly
    ? date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })
    : date.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

function UpdateIllustration({ status }: { status: UpdateStatus }) {
  const id = useId();
  const badgeColor = status === "error" ? "#dc2626" : status === "current" || status === "installed" ? "#16a34a" : "#2563eb";

  return (
    <svg className="scsms-update-icon" viewBox="0 0 130 120" aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-arrows`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#3b82f6" />
          <stop offset="1" stopColor="#1d4ed8" />
        </linearGradient>
      </defs>
      <g className="scsms-update-arrows" fill="none" stroke={`url(#${id}-arrows)`} strokeWidth="10" strokeLinecap="round" strokeLinejoin="round">
        <path d="M18 48 C24 24 54 10 80 18 C92 22 100 30 104 38" />
        <path d="M82 38 L106 40 L104 14" />
        <path d="M112 72 C106 96 76 110 50 102 C38 98 30 90 26 82" />
        <path d="M48 82 L24 80 L26 106" />
      </g>
      <circle cx="94" cy="86" r="24" fill={badgeColor} />
      <g fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {status === "error" ? <path d="M94 75v13m0 9h.01" />
          : status === "current" || status === "installed" ? <path d="M83 86 L91 94 L106 78" />
            : status === "available" || status === "downloading" ? <path d="M94 74v23m-9-9 9 9 9-9" />
              : <path d="M94 74v12l8 5" />}
      </g>
    </svg>
  );
}

export function SettingsUpdatePanel() {
  const updater = useAppUpdater();
  const historyId = useId();
  const [historyOpen, setHistoryOpen] = useState(true);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const supported = updater?.supported ?? false;
  const status = updater?.status ?? "idle";
  const busy = ["checking", "downloading", "installing"].includes(status);
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const paused = Boolean(updater?.pauseUntil && new Date(`${updater.pauseUntil}T00:00:00`).getTime() > now.getTime());
  const pauseLabel = paused && updater ? displayDate(`${updater.pauseUntil}T00:00:00`, true) : "Pick a date";
  const canInstall = Boolean(supported && updater?.availableVersion && (status === "available" || status === "error"));
  const percent = updater?.totalBytes ? Math.min(100, Math.round(updater.downloadedBytes / updater.totalBytes * 100)) : undefined;
  const titles: Record<UpdateStatus, string> = {
    idle: "Ready to check for updates",
    checking: "Checking for updates…",
    current: "You're up to date",
    available: `SCSMS ${updater?.availableVersion} is available`,
    downloading: "Downloading update…",
    installing: "Installing update…",
    installed: "Restart to finish updating",
    error: "Update needs attention",
  };

  return (
    <section className="panel scsms-update-panel" aria-labelledby="scsms-update-title">
      <div className="scsms-update-heading">
        <h2 id="scsms-update-title">Update</h2>
        <p>Stay informed with the latest developments — check, pause and review history.</p>
      </div>

      <div className="scsms-update-status">
        <UpdateIllustration status={supported ? status : "idle"} />
        <div className="scsms-update-status-text" role="status" aria-live="polite">
          <h3>{supported ? titles[status] : "Desktop updates"}</h3>
          {supported ? <>
            <p>Last checked: {updater?.lastChecked ? displayDate(updater.lastChecked) : "Not checked yet"}</p>
            <p className="scsms-update-version">Current version: SCSMS {updater?.currentVersion}</p>
          </> : <p>Open SCSMS on your desktop to check for and install updates.</p>}
        </div>
        <button type="button" className="scsms-update-primary" disabled={!supported || busy} onClick={() => void (status === "installed" ? updater?.restart() : updater?.check())}>
          {status === "installed" ? "Restart now" : status === "checking" ? "Checking…" : "Check for updates"}
        </button>
      </div>

      {updater?.error && <div className="scsms-update-notice" role="alert">
        <strong>The update could not be completed</strong>
        <p>{updater.error}</p>
        <span>Check your connection and try again.</span>
      </div>}

      {updater?.availableVersion && <section className="scsms-update-release" aria-label="Available release details">
        <div className="scsms-update-release-heading">
          <div>
            <h3>SCSMS {updater.availableVersion}</h3>
            <p>{updater.releaseDate ? `Released ${displayDate(updater.releaseDate, true)}` : "Latest available release"}</p>
          </div>
          {canInstall && <button type="button" className="scsms-update-primary" onClick={() => void updater.install()}>
            <Download aria-hidden="true" /> {status === "error" ? "Retry installation" : "Download and install"}
          </button>}
        </div>
        <div className="scsms-update-release-notes">
          <h4>What&apos;s new</h4>
          <p>{updater.releaseNotes || "No release notes provided for this version."}</p>
        </div>
        {canInstall && <p className="scsms-update-install-note">Save your work before installing. SCSMS will close during installation on Windows.</p>}
        {status === "downloading" && <div className="scsms-update-progress">
          <progress max={100} value={percent} aria-label="Update download progress" />
          <span role="status">{percent === undefined ? `${(updater.downloadedBytes / 1024 / 1024).toFixed(1)} MB downloaded` : `${percent}% downloaded`}</span>
        </div>}
        {status === "installing" && <p className="scsms-update-install-note" role="status">Installing the update. Please wait…</p>}
        {status === "installed" && <p className="scsms-update-install-note">The update is installed. Restart SCSMS to use the new version.</p>}
      </section>}

      <h3 className="scsms-update-section-title">More options</h3>
      <div className="scsms-update-card">
        <Megaphone className="scsms-update-lead" aria-hidden="true" />
        <div className="scsms-update-card-body">
          <div className="scsms-update-card-title">Get the latest updates as soon as they&apos;re available</div>
          <div className="scsms-update-card-sub">Check automatically once a day while SCSMS is open for the latest fixes and improvements. You choose when to install.</div>
        </div>
        <div className="scsms-update-toggle-wrap">
          <span>{updater?.automaticChecks ? "On" : "Off"}</span>
          <button type="button" className="scsms-switch" role="switch" aria-checked={updater?.automaticChecks ?? false} aria-label="Check for updates automatically" disabled={!supported} onClick={() => updater?.setAutomaticChecks(!updater.automaticChecks)} />
        </div>
      </div>

      <div className="scsms-update-card">
        <Pause className="scsms-update-lead" aria-hidden="true" />
        <div className="scsms-update-card-body">
          <div className="scsms-update-card-title">Pause updates</div>
          <div className="scsms-update-card-sub">{paused ? `Automatic checks paused until ${pauseLabel}. You can still check manually.` : "Select a date to pause automatic checks until."}</div>
        </div>
        <div className="scsms-update-pause-actions">
          <label className={`scsms-date-btn ${!supported || busy ? "is-disabled" : ""}`}>
            <span>{pauseLabel}</span>
            <CalendarDays className="scsms-chev" aria-hidden="true" />
            <input type="date" min={today} value={updater?.pauseUntil ?? ""} disabled={!supported || busy} onChange={(event) => updater?.setPauseUntil(event.target.value)} aria-label="Pause automatic update checks until" />
          </label>
          {updater?.pauseUntil && <button type="button" className="scsms-update-resume" disabled={!supported || busy} onClick={() => updater.setPauseUntil("")}>
            <RotateCw aria-hidden="true" /> Resume
          </button>}
        </div>
      </div>

      <button type="button" className="scsms-update-card scsms-update-history-toggle clickable" aria-expanded={historyOpen} aria-controls={historyId} onClick={() => setHistoryOpen((open) => !open)}>
        <History className="scsms-update-lead" aria-hidden="true" />
        <span className="scsms-update-card-body"><span className="scsms-update-card-title">Update history</span></span>
        <ChevronRight className={`scsms-chev ${historyOpen ? "open" : ""}`} aria-hidden="true" />
      </button>
      {historyOpen && <div className="scsms-history" id={historyId}>
        {updater?.history.length ? updater.history.map((entry) => <div className="scsms-h-item" key={`${entry.version}-${entry.installedAt}`}>
          <div className="scsms-h-title">SCSMS {entry.version}</div>
          <div className="scsms-h-sub">Installation confirmed on {displayDate(entry.installedAt)}</div>
        </div>) : <div className="scsms-h-item">
          <div className="scsms-h-title">No updates recorded yet</div>
          <div className="scsms-h-sub">Updates installed through SCSMS appear here after the next launch confirms the version.</div>
        </div>}
      </div>}
    </section>
  );
}
