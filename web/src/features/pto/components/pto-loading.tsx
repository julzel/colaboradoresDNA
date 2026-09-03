import { ClipboardClock } from "lucide-react";

import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";
import { PageSectionHeader } from "@/components/ui/page-section-header/page-section-header";

import styles from "./pto-loading.module.css";

const summaryCards = ["balance", "pending"] as const;
const historyRows = ["first", "second", "third"] as const;

export function PtoLoading() {
  return (
    <LoadingRegion className={styles.loading ?? ""} label="Cargando ausencias">
      <header>
        <PageSectionHeader icon={ClipboardClock} title="Ausencias" />
      </header>

      <section
        aria-label="Cargando resumen de ausencias"
        className={styles.summaryCards}
      >
        {summaryCards.map((card) => (
          <ElevatedSurface as="div" className={styles.summaryCard} key={card}>
            <Skeleton height="3.5rem" variant="circle" width="3.5rem" />
            <div className={styles.summaryCopy}>
              <Skeleton variant="line" width="8rem" />
              <Skeleton height="2rem" variant="line" width="4.5rem" />
            </div>
          </ElevatedSurface>
        ))}
      </section>

      <ElevatedSurface as="section" className={styles.historyPanel}>
        <div className={styles.historyTabs}>
          <Skeleton height="1rem" variant="line" width="3.75rem" />
          <Skeleton height="1rem" variant="line" width="5rem" />
          <Skeleton height="1rem" variant="line" width="5.5rem" />
        </div>
        <div className={styles.historyRows}>
          {historyRows.map((row) => (
            <div className={styles.historyRow} key={row}>
              <Skeleton height="2.5rem" variant="circle" width="2.5rem" />
              <div>
                <Skeleton variant="line" width="7rem" />
                <Skeleton variant="line" width="min(18rem, 65%)" />
              </div>
              <Skeleton height="1.5rem" variant="line" width="4.5rem" />
            </div>
          ))}
        </div>
      </ElevatedSurface>
    </LoadingRegion>
  );
}
