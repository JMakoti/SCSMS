"use client";

import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useFeatureData } from "../data/feature-data-context";
import { useAcademicYear } from "../academic-years/academic-year-context";
import { useSyncState } from "../data/sync-context";
import { buildSchoolNotifications, notificationReadToken, type SchoolNotification } from "./school-notifications";

const readEvent = "scsms:notifications-read";
const serverSnapshot = () => "";

export function useNotifications() {
  const data = useFeatureData();
  const { currentAcademicYear } = useAcademicYear();
  const syncError = useSyncState()?.error;
  const notifications = useMemo(() => {
    const items = buildSchoolNotifications(data, currentAcademicYear.id, currentAcademicYear.name);
    if (syncError && !items.some((item) => item.category === "sync")) {
      items.unshift({
        id: "sync:service", category: "sync", severity: "error", schoolName: "Synchronization",
        title: "Data synchronization needs attention", description: syncError,
        href: "/synchronization",
      });
    }
    return items;
  }, [data, currentAcademicYear.id, currentAcademicYear.name, syncError]);
  const key = `scsms:notifications:${encodeURIComponent(data.profile.email)}:${currentAcademicYear.id}`;
  const fallback = useRef<Record<string, string>>({});
  const subscribe = useCallback((listener: () => void) => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === key || event.key === null) {
        delete fallback.current[key];
        listener();
      }
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener(readEvent, listener);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(readEvent, listener);
    };
  }, [key]);
  const getSnapshot = useCallback(() => {
    try { return fallback.current[key] ?? localStorage.getItem(key) ?? ""; }
    catch { return fallback.current[key] ?? ""; }
  }, [key]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, serverSnapshot);
  const read = useMemo(() => {
    try {
      const values: unknown = JSON.parse(snapshot || "[]");
      return new Set<string>(Array.isArray(values) ? values.filter((value) => typeof value === "string") : []);
    } catch { return new Set<string>(); }
  }, [snapshot]);
  const isRead = (notification: SchoolNotification) => read.has(notificationReadToken(notification));
  const markRead = (selected: SchoolNotification[]) => {
    const next = new Set([...read, ...selected.map(notificationReadToken)]);
    const value = JSON.stringify(notifications.map(notificationReadToken).filter((token) => next.has(token)));
    fallback.current[key] = value;
    try { localStorage.setItem(key, value); } catch { /* Keep read status for this session. */ }
    window.dispatchEvent(new Event(readEvent));
  };
  return {
    notifications, isRead, markRead,
    unreadCount: notifications.filter((item) => !isRead(item)).length,
    academicYear: currentAcademicYear.name,
  };
}
