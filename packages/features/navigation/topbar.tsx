"use client";

import {
  Bell,
  ChevronDown,
  Lock,
  Menu,
  Search,
  Settings,
  Sun,
  Moon,
  LogOut,
} from "lucide-react";
export function Topbar({
  onSearch,
  onSync,
  dark,
  onTheme,
  user,
  onProfile = () => {
    window.location.hash = "profile";
    window.dispatchEvent(new Event("scsms-profile"));
  },
  onMenu,
  onLogout,
}: {
  onSearch: () => void;
  onSync: () => void;
  dark: boolean;
  onTheme: () => void;
  user: { email: string };
  onProfile?: () => void;
  onMenu?: () => void;
  onLogout?: () => void;
}) {
  const emailName = user.email.split("@")[0] ?? "user";
  const displayName = emailName
    .split(/[._-]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
  const initials = emailName.slice(0, 2).toUpperCase();

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
        <div className="user-menu">
          <button
            className="user-trigger"
            type="button"
            aria-label="Open profile"
          >
            <div className="avatar">{initials}</div>
            <div className="user-copy">
              <strong>{displayName}</strong>
              <small>{user.email}</small>
            </div>
            <ChevronDown />
          </button>
          <div className="user-dropdown">
            <div className="profile-menu-head">
              <strong>{displayName}</strong>
              <span>{user.email}</span>
            </div>
            <button onClick={onProfile}>
              <Settings /> Settings
            </button>
            <button type="button">
              <Lock /> Lock Application
            </button>
            <button onClick={onLogout} type="button">
              <LogOut /> Sign Out
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Topbar;
