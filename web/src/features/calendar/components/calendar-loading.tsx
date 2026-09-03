import { CalendarDays } from "lucide-react";

import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";

import styles from "./calendar.module.css";

export function CalendarLoading() {
  return (
    <LoadingRegion className={styles.loading ?? ""} label="Cargando calendario">
      <PageSectionHeader icon={CalendarDays} title="Calendario" />

      <div className={styles.loadingControls}>
        <div className={styles.loadingToolbar}>
          <Skeleton height="2.75rem" width="4.75rem" />
          <Skeleton height="2.75rem" width="5.5rem" />
          <Skeleton height="1.25rem" variant="line" width="13rem" />
        </div>
        <Skeleton height="2.75rem" width="10rem" />
      </div>

      <div className={styles.loadingList}>
        <Skeleton height="12.5rem" />
        <Skeleton height="12.5rem" />
        <Skeleton height="7.5rem" />
      </div>
    </LoadingRegion>
  );
}
