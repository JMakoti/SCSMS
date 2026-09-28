"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  Building2,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  DatabaseBackup,
  FileBarChart2,
  History,
  LayoutDashboard,
  MapPinned,
  RefreshCw,
  Settings,
  School,
  Server,
  UserCog,
  Users,
  Gauge,
  X,
} from "lucide-react";
import { moduleForPath } from "../navigation/module-for-path";
import { routeForModule } from "../navigation/route-for-module";
const navGroups = [
  {
    label: "Overview",
    items: [
      ["Dashboard", LayoutDashboard],
      ["Schools", School],
      ["Ward", MapPinned],
      ["School Contacts", BookOpen],
      ["Enrollment", Users],
      ["Staff", UserCog],
      ["Infrastructure", Building2],
      ["Performance", Gauge],
    ],
  },
  {
    label: "Reports",
    items: [
      ["Reports", FileBarChart2],
      ["Data Quality", ClipboardCheck],
    ],
  },
  {
    label: "Administration",
    items: [
      ["Users & Roles", UserCog],
      ["Audit Logs", History],
      ["Backup & Restore", DatabaseBackup],
      ["Synchronization", RefreshCw],
    ],
  },
  {
    label: "System",
    items: [
      ["Settings", Settings],
      ["System Information", Server],
    ],
  },
] as const;

export function Sidebar({
  active,
  setActive,
  collapsed,
  setCollapsed,
  onCloseMobile,
}: {
  active?: string;
  setActive?: (v: string) => void;
  collapsed: boolean;
  setCollapsed: (v: boolean) => void;
  onCloseMobile?: () => void;
}) {
  const pathname = usePathname();
  const current = active ?? moduleForPath(pathname);

  return (
    <aside className={`sidebar ${collapsed ? "collapsed" : ""}`}>
      <div className="brand">
        <div className="brand-mark">
          <School />
        </div>
        <div className="brand-copy">
          <div className="brand-name">SC-SMS</div>
          <div className="brand-sub">Sub-County Education Office</div>
        </div>
        <button
          className="mobile-nav-close"
          type="button"
          onClick={onCloseMobile}
          aria-label="Close navigation menu"
        >
          <X />
        </button>
      </div>
      <div className="sidebar-scroll">
        {navGroups.map((group) => (
          <div className="nav-group" key={group.label}>
            <div className="nav-label">{!collapsed && group.label}</div>
            {group.items.map(([label, Icon]) => (
              <Link
                key={label}
                className={`nav-item ${current === label ? "active" : ""}`}
                href={routeForModule(label)}
                onClick={() => {
                  setActive?.(label);
                  onCloseMobile?.();
                }}
                title={collapsed ? label : undefined}
              >
                <Icon />
                {!collapsed && <span>{label}</span>}
                {!collapsed && label === "Synchronization" && (
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
          onClick={() => setCollapsed(!collapsed)}
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
  );
}

export default Sidebar;
