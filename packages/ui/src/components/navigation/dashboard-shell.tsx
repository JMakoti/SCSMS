"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  School,
  BookOpen,
  Users,
  UserCog,
  Building2,
  FileBarChart2,
  ClipboardCheck,
  History,
  DatabaseBackup,
  RefreshCw,
  Settings,
  Server,
  Search,
  Sun,
  Moon,
  Menu,
  X,
  MapPinned,
} from "lucide-react";
import { useState } from "react";
const groups = [
  {
    label: "Overview",
    items: [
      ["Dashboard", "/", LayoutDashboard],
      ["Schools", "/schools", School],
      ["Ward", "/ward", MapPinned],
      ["School Contacts", "/contacts", BookOpen],
      ["Enrollment", "/enrollment", Users],
      ["Staff", "/staff", UserCog],
      ["Infrastructure", "/infrastructure", Building2],
    ],
  },
  {
    label: "Reports",
    items: [
      ["Reports", "/reports", FileBarChart2],
      ["Data Quality", "/data-quality", ClipboardCheck],
    ],
  },
  {
    label: "Administration",
    items: [
      ["Users & Roles", "/users", UserCog],
      ["Audit Logs", "/audit-logs", History],
      ["Backup & Restore", "/backup", DatabaseBackup],
      ["Synchronization", "/synchronization", RefreshCw],
    ],
  },
  {
    label: "System",
    items: [
      ["Settings", "/settings", Settings],
      ["System Information", "/system-information", Server],
    ],
  },
] as const;

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [dark, setDark] = useState(true);
  return (
    <div
      className={`app ${dark ? "dark-theme" : ""} ${mobileOpen ? "mobile-nav-open" : ""}`}
    >
      <button
        className="mobile-nav-backdrop"
        aria-label="Close navigation"
        onClick={() => setMobileOpen(false)}
      />
      <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="brand">
          <button
            className="mobile-nav-close"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          >
            <X />
          </button>
          <div className="brand-mark">
            <School />
          </div>
          {!collapsed && (
            <div>
              <div className="brand-name">SC-SMS</div>
              <div className="brand-sub">Sub-County Education Office</div>
            </div>
          )}
        </div>
        <div className="sidebar-scroll">
          {groups.map((group) => (
            <div className="nav-group" key={group.label}>
              <div className="nav-label">{!collapsed && group.label}</div>
              {group.items.map(([label, href, Icon]) => (
                <Link
                  className={`nav-item ${pathname === href || (href !== "/" && pathname.startsWith(href)) ? "active" : ""}`}
                  href={href}
                  key={label}
                  title={collapsed ? label : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon />
                  {!collapsed && <span>{label}</span>}
                  {label === "Synchronization" && !collapsed && (
                    <span className="nav-count">7</span>
                  )}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div className="sidebar-footer">
          <button
            className="collapse-button"
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? (
              <ChevronRight />
            ) : (
              <>
                <ChevronLeft />
                <span>Collapse menu</span>
              </>
            )}
          </button>
        </div>
      </aside>
      <section className="main">
        <header className="topbar">
          <button
            className="mobile-nav-toggle"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu />
          </button>
          <button className="global-search">
            <Search />
            <span>Search schools, records, staff...</span>
            <kbd>Ctrl K</kbd>
          </button>
          <div className="top-actions">
            <button
              className="theme-toggle"
              onClick={() => setDark((value) => !value)}
              aria-label="Toggle theme"
            >
              {dark ? <Sun /> : <Moon />}
            </button>
            <button className="sync-pill">
              <span className="online-dot" />
              <span className="sync-copy">
                <strong>Online</strong>
                <small>Last synced 2 hours ago</small>
              </span>
              <ChevronDown />
            </button>
            <button
              className="icon-button notification"
              aria-label="Notifications"
            >
              <Bell />
              <span>3</span>
            </button>
            <Link className="user-trigger" href="/profile">
              <div className="avatar">EO</div>
              <div className="user-copy">
                <strong>Education Officer</strong>
                <small>Sub-County Office</small>
              </div>
              <ChevronDown />
            </Link>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="statusbar">
          <span className="online-dot" />
          Online · Last synced 2 hours ago
        </footer>
      </section>
    </div>
  );
}

export function RouteHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mx-auto mb-5 flex max-w-7xl flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2 text-[10px] text-slate-400">
          <span>SC-SMS</span>
          <span>/</span>
          <span>{eyebrow}</span>
        </div>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-800 dark:text-slate-100">
          {title}
        </h1>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {description}
        </p>
      </div>
      {action}
    </div>
  );
}

export function RoutePage({
  eyebrow,
  title,
  description,
  children,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <DashboardShell>
      <RouteHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />
      {children ?? (
        <section className="rounded-xl border border-slate-200 bg-white p-7 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
            {title} workspace
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            This page is ready for its dedicated records and workflows.
          </p>
        </section>
      )}
    </DashboardShell>
  );
}
