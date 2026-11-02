"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { Bell, Building2, Check, CheckCheck, CloudAlert, ContactRound, School, Users, X } from "lucide-react";
import { useNotifications } from "./use-notifications";
import styles from "./notifications-menu.module.css";

const icons = { enrollment: Users, school: School, contacts: ContactRound, staff: Users, infrastructure: Building2, sync: CloudAlert };

function NotificationsList({ state, onClose }: { state: ReturnType<typeof useNotifications>; onClose: () => void }) {
  const { notifications, unreadCount, isRead, markRead, academicYear } = state;
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [limit, setLimit] = useState(20);
  const visible = unreadOnly ? notifications.filter((item) => !isRead(item)) : notifications;
  return (
    <>
      <div className={styles.heading}>
        <div><h2>Notifications</h2><p>{academicYear} · {unreadCount} unread</p></div>
        <button className={styles.close} type="button" onClick={onClose} aria-label="Close notifications"><X /></button>
      </div>
      <div className={styles.toolbar}>
        <div className={styles.filters}>
          <button type="button" aria-pressed={!unreadOnly} onClick={() => { setUnreadOnly(false); setLimit(20); }}>All ({notifications.length})</button>
          <button type="button" aria-pressed={unreadOnly} onClick={() => { setUnreadOnly(true); setLimit(20); }}>Unread</button>
        </div>
        <button className={styles.markAll} type="button" disabled={!unreadCount} onClick={() => markRead(notifications)}><CheckCheck /> Mark all read</button>
      </div>
      <div className={styles.list}>
        {!visible.length && <div className={styles.empty} role="status"><CheckCheck /><strong>{unreadOnly ? "No unread notifications" : "You're all caught up"}</strong><p>{unreadOnly ? "Select All to review ongoing issues." : "No outstanding school record issues were found."}</p></div>}
        {visible.slice(0, limit).map((notification) => {
          const Icon = icons[notification.category];
          const read = isRead(notification);
          return <article key={notification.id} className={`${styles.item} ${!read ? styles.unread : ""}`}>
            <div className={styles.icon} data-severity={notification.severity}><Icon aria-hidden="true" /></div>
            <Link href={notification.href} className={styles.link} onClick={() => { markRead([notification]); onClose(); }}>
              <span className={styles.school}>{notification.schoolName}</span>
              <strong>{notification.title}</strong>
              <p>{notification.description}</p>
              <span className={styles.action}>Review {notification.category === "sync" ? "sync status" : "record"} →</span>
            </Link>
            {!read && <button className={styles.markOne} type="button" onClick={() => markRead([notification])} aria-label={`Mark ${notification.title} for ${notification.schoolName} as read`}><Check /></button>}
          </article>;
        })}
        {visible.length > limit && <button type="button" className={styles.more} onClick={() => setLimit((value) => value + 20)}>Show more ({visible.length - limit} remaining)</button>}
      </div>
      <div className={styles.footer}>Alerts refresh with your records and clear when resolved.</div>
    </>
  );
}

export function NotificationsMenu() {
  const state = useNotifications();
  const { unreadCount } = state;
  const [open, setOpen] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") { setOpen(false); trigger.current?.focus(); }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return <div ref={container} className={styles.container}>
    <button ref={trigger} type="button" className="icon-button notification" aria-label={`Notifications, ${unreadCount} unread`} aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((value) => !value)}>
      <Bell aria-hidden="true" />
      {unreadCount > 0 && <span aria-hidden="true">{unreadCount > 99 ? "99+" : unreadCount}</span>}
    </button>
    {open && <section id={panelId} className={styles.panel} aria-label="Notifications">
      <NotificationsList state={state} onClose={() => { setOpen(false); trigger.current?.focus(); }} />
    </section>}
  </div>;
}
