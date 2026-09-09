"use client";

import { Bell, Check, Inbox } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal/modal";
import { formatCalendarTime } from "@/features/calendar/domain/calendar-utils";
import {
  getUnreadNotificationsAction,
  markNotificationReadAction,
} from "../actions/dashboard-notification-actions";
import type { DashboardNotification } from "../domain/dashboard-notification";
import headerStyles from "@/components/layout/workspace-header/workspace-header.module.css";
import styles from "./notification-drawer.module.css";

const shortMonths = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

/** Compact notification-only dates: `Sáb, 3 Oct 2026`. */
export function formatNotificationDate(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("es-CR", {
    timeZone: "UTC",
    weekday: "long",
  })
    .format(date)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .slice(0, 3);
  const dayName = weekday.charAt(0).toLocaleUpperCase("es-CR") + weekday.slice(1);
  return `${dayName}, ${date.getUTCDate()} ${shortMonths[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function NotificationDrawer({ unreadCount }: { unreadCount: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<DashboardNotification[] | null>(null);
  const [removed, setRemoved] = useState<string[]>([]);
  const [busy, setBusy] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!open) return;
    let active = true;
    void getUnreadNotificationsAction()
      .then((notifications) => {
        if (active) setItems(notifications);
      })
      .catch(() => {
        if (active)
          setError(
            "No se pudieron cargar las notificaciones. Cerrá el panel e intentá de nuevo.",
          );
      });
    return () => {
      active = false;
    };
  }, [open, unreadCount]);

  async function read(item: DashboardNotification, navigate: boolean) {
    if (busy.includes(item.key)) return;
    setBusy((keys) => [...keys, item.key]);
    setError("");
    try {
      const { href } = await markNotificationReadAction(item.key);
      setRemoved((keys) => [...keys, item.key]);
      if (navigate) {
        setOpen(false);
        router.refresh();
        router.push(href);
      }
    } catch {
      setError("No pudimos marcar la notificación como leída. Intentá de nuevo.");
    } finally {
      setBusy((keys) => keys.filter((key) => key !== item.key));
    }
  }

  return (
    <>
      <button
        type="button"
        className={headerStyles.notificationButton}
        aria-label={
          unreadCount ? `${unreadCount} notificaciones sin leer` : "Notificaciones"
        }
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setError("");
          setItems(null);
          setOpen(true);
        }}
      >
        <Bell aria-hidden="true" size={20} />
        {unreadCount > 0 && (
          <span className={headerStyles.notificationBadge}>
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
      {open &&
        createPortal(
          <Modal
            title="Notificaciones"
            variant="drawer"
            icon={<Bell size={21} aria-hidden="true" />}
            onClose={() => {
              setOpen(false);
              router.refresh();
            }}
          >
            <div className={styles.content}>
              {error && <p role="alert">{error}</p>}
              {!items && !error && <p role="status">Cargando notificaciones…</p>}
              {items && items.every((item) => removed.includes(item.key)) && (
                <div className={styles.empty} role="status">
                  <Inbox size={36} aria-hidden="true" />
                  <h3>Estás al día</h3>
                  <p>No tenés notificaciones pendientes.</p>
                </div>
              )}
              <ul className={styles.list}>
                {items?.map((item) => (
                  <li
                    key={item.key}
                    className={styles.row}
                    data-removing={removed.includes(item.key)}
                    aria-hidden={removed.includes(item.key)}
                    onAnimationEnd={(event) => {
                      if (removed.includes(item.key)) {
                        if (event.currentTarget.contains(document.activeElement)) {
                          const next =
                            event.currentTarget.nextElementSibling?.querySelector<HTMLButtonElement>(
                              "button:not(:disabled)",
                            ) ??
                            event.currentTarget
                              .closest('[role="dialog"]')
                              ?.querySelector<HTMLButtonElement>(
                                'button[aria-label="Cerrar"]',
                              );
                          next?.focus();
                        }
                        setItems(
                          (current) =>
                            current?.filter((entry) => entry.key !== item.key) ?? null,
                        );
                        router.refresh();
                      }
                    }}
                  >
                    <div className={styles.card}>
                      <button
                        type="button"
                        className={styles.detail}
                        disabled={busy.includes(item.key) || removed.includes(item.key)}
                        onClick={() => void read(item, true)}
                      >
                        <span className={styles.label}>{item.label}</span>
                        <strong>{item.title}</strong>
                        <span className={styles.date}>
                          {formatNotificationDate(item.startDate)}
                          {item.endDate !== item.startDate
                            ? ` – ${formatNotificationDate(item.endDate)}`
                            : item.allDay
                              ? " · Todo el día"
                              : ` · ${formatCalendarTime(item.startsAt)}`}
                        </span>
                      </button>
                      <button
                        className={styles.markRead}
                        type="button"
                        disabled={busy.includes(item.key) || removed.includes(item.key)}
                        onClick={() => void read(item, false)}
                        aria-label={`Marcar como leída: ${item.label} · ${item.title}`}
                        title="Marcar como leída"
                      >
                        <Check size={19} aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </Modal>,
          document.body,
        )}
    </>
  );
}
