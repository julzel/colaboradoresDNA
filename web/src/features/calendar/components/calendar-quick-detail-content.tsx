import { CakeSlice, CalendarDays, Clock3, ExternalLink } from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import { formatCalendarDate } from "@/features/calendar/domain/calendar-utils";
import {
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
  type PtoCategory,
} from "@/features/pto/domain/pto";

import styles from "./calendar.module.css";

export type CalendarPtoQuickDetail = {
  category: PtoCategory;
  durationUnits: number;
  endDate: string;
  id: string;
  requesterName: string;
  startDate: string;
  status: "approved";
};

export type CalendarBirthdayQuickDetail = {
  date: string;
  displayName: string;
  note: string | null;
};

function formatDateRange(startDate: string, endDate: string) {
  return startDate === endDate
    ? formatCalendarDate(startDate, true)
    : `${formatCalendarDate(startDate, true)} – ${formatCalendarDate(endDate, true)}`;
}

export function CalendarPtoQuickDetailContent({
  detail,
}: {
  detail: CalendarPtoQuickDetail;
}) {
  return (
    <div className={styles.eventDetailContent}>
      <div className={styles.eventDetailOverview}>
        <span className={styles.quickDetailLabel} data-kind="pto">
          {ptoCategoryLabels[detail.category]}
        </span>
        <StatusBadge tone="success">{ptoStatusLabels[detail.status]}</StatusBadge>
      </div>

      <dl className={styles.eventDetailFacts}>
        <div>
          <dt>
            <CalendarDays aria-hidden="true" size={18} />
            Fechas
          </dt>
          <dd>{formatDateRange(detail.startDate, detail.endDate)}</dd>
        </div>
        <div>
          <dt>
            <Clock3 aria-hidden="true" size={18} />
            Duración
          </dt>
          <dd>{formatPtoDays(detail.durationUnits)} días</dd>
        </div>
      </dl>

      <div className={styles.eventDetailActions}>
        <ButtonLink href={`/ausencias/${detail.id}`}>
          Ver solicitud completa
          <ExternalLink aria-hidden="true" size={17} />
        </ButtonLink>
      </div>
    </div>
  );
}

export function CalendarBirthdayQuickDetailContent({
  detail,
}: {
  detail: CalendarBirthdayQuickDetail;
}) {
  return (
    <div className={styles.eventDetailContent}>
      <div className={styles.eventDetailOverview}>
        <span className={styles.quickDetailLabel} data-kind="birthday">
          Cumpleaños
        </span>
      </div>

      <dl className={styles.eventDetailFacts}>
        <div>
          <dt>
            <CakeSlice aria-hidden="true" size={18} />
            Fecha
          </dt>
          <dd>{formatCalendarDate(detail.date, true)}</dd>
        </div>
      </dl>

      {detail.note && <p className={styles.quickDetailNote}>{detail.note}</p>}
    </div>
  );
}
