import { Bell, CalendarDays, Clock3 } from "lucide-react";

import { Button, ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import {
  formatCalendarDate,
  formatCalendarTime,
} from "@/features/calendar/domain/calendar-utils";
import { getCalendarDashboardNotifications } from "@/features/calendar/server/calendar-service";
import {
  openDashboardNotificationAction,
  readAllDashboardNotificationsAction,
} from "@/features/dashboard/actions/dashboard-notification-actions";
import styles from "@/features/dashboard/components/dashboard.module.css";

function eventSchedule(notification: {
  allDay: boolean;
  endDate: string;
  startDate: string;
  startsAt: string;
}) {
  if (notification.allDay) {
    return notification.startDate === notification.endDate
      ? `${formatCalendarDate(notification.startDate, true)} · Todo el día`
      : `${formatCalendarDate(notification.startDate, true)} – ${formatCalendarDate(
          notification.endDate,
          true,
        )}`;
  }

  return `${formatCalendarDate(notification.startDate, true)} · ${formatCalendarTime(
    notification.startsAt,
  )}`;
}

export default async function HomePage() {
  const dashboard = await getCalendarDashboardNotifications();

  return (
    <Container>
      <main className={styles.page} id="main-content">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Colaboradores DNA</p>
            <h1>Hola, {dashboard.displayName}</h1>
            <p>Revisá tus próximas actividades y accesos principales.</p>
          </div>
          <ButtonLink href="/calendario" variant="secondary">
            <CalendarDays aria-hidden="true" size={18} />
            Ver calendario
          </ButtonLink>
        </header>

        <ElevatedSurface as="section" className={styles.notifications}>
          <div className={styles.sectionHeader}>
            <div>
              <p className="eyebrow">Notificaciones</p>
              <h2>Próximas notificaciones</h2>
            </div>
            <div className={styles.notificationHeaderActions}>
              {dashboard.unreadCount > 0 && (
                <form action={readAllDashboardNotificationsAction}>
                  <Button size="small" type="submit" variant="quiet">
                    Marcar todas como leídas
                  </Button>
                </form>
              )}
              <Bell aria-hidden="true" size={24} />
            </div>
          </div>

          {dashboard.notifications.length === 0 ? (
            <p className={styles.empty}>No tenés notificaciones próximas.</p>
          ) : (
            <ul className={styles.notificationList}>
              {dashboard.notifications.map((notification) => (
                <li key={`${notification.kind}:${notification.id}`}>
                  <form action={openDashboardNotificationAction}>
                    <input
                      name="notificationKey"
                      type="hidden"
                      value={notification.key}
                    />
                    <button
                      className={styles.notificationLink}
                      data-unread={notification.isUnread}
                      type="submit"
                    >
                      <span className={styles.notificationMeta}>
                        <span
                          className={styles.eventType}
                          data-event-type={notification.eventType ?? undefined}
                        >
                          {notification.label}
                        </span>
                        {notification.isUnread && (
                          <span className={styles.unreadLabel}>Nueva</span>
                        )}
                      </span>
                      <strong>{notification.title}</strong>
                      <span className={styles.schedule}>
                        <Clock3 aria-hidden="true" size={15} />
                        {eventSchedule(notification)}
                      </span>
                    </button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </ElevatedSurface>
      </main>
    </Container>
  );
}
