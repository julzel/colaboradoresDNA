import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";

import styles from "./calendar.module.css";

export function CalendarLoading() {
  return (
    <LoadingRegion className={styles.loading ?? ""} label="Cargando calendario">
      <div className={styles.loadingHeading}>
        <Skeleton variant="line" width="7rem" />
        <Skeleton height="2.5rem" variant="line" width="16rem" />
        <Skeleton variant="line" width="min(30rem, 100%)" />
      </div>
      <Skeleton height="5rem" />
      <div className={styles.loadingList}>
        <Skeleton height="9rem" />
        <Skeleton height="9rem" />
        <Skeleton height="9rem" />
      </div>
    </LoadingRegion>
  );
}
