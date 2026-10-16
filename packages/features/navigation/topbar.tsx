"use client";

import {
  Bell,
  ChevronDown,
  Menu,
  Search,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
export function Topbar({
  onSearch,
  onSync,
  dark,
  onTheme,
  onMenu,
  onLogout,
}: {
  onSearch: () => void;
  onSync: () => void;
  dark: boolean;
  onTheme: () => void;
  onMenu?: () => void;
  onLogout: () => void;
}) {
  return (
    <header className="topbar">
      <button
        className="mobile-menu"
        type="button"
        onClick={onMenu}
        aria-label="Open navigation menu"
      >
        <Menu />
      </button>
      <button className="global-search" onClick={onSearch}>
        <Search />
        <span>Search schools, records, staff...</span>
        <kbd>Ctrl K</kbd>
      </button>
      <div className="top-actions">
        <button
          className="theme-toggle"
          onClick={onTheme}
          aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {dark ? <Sun /> : <Moon />}
        </button>
        <button className="sync-pill" onClick={onSync}>
          <span className="online-dot" />
          <span className="sync-copy">
            <strong>Online</strong>
            <small>Last synced 2 hours ago</small>
          </span>
          <ChevronDown />
        </button>
        <button className="icon-button notification" aria-label="Notifications">
          <Bell />
          <span>3</span>
        </button>
        <button
          className="outline-button topbar-logout"
          type="button"
          onClick={onLogout}
          aria-label="Log out"
        >
          <LogOut size={16} aria-hidden="true" />
          Log out
        </button>
      </div>
    </header>
  );
}

export default Topbar;
