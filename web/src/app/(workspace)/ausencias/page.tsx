import type { Metadata } from "next";
import {
  ArrowRight,
  CalendarPlus,
  ClipboardClock,
  Clock3,
  Umbrella,
} from "lucide-react";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import styles from "@/features/pto/components/pto.module.css";
import { formatPtoDays } from "@/features/pto/domain/pto";
import { getPtoDashboard } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Solicitudes de ausencia" };

export default async function PtoDashboardPage() {
  const dashboard = await getPtoDashboard();

  return (
    <Container>
      <div className={styles.page}>
        <header className={styles.header}>
          <div className={styles.headerContent}>
            <div className={styles.moduleTitle}>
              <span className={styles.moduleIcon}>
                <ClipboardClock aria-hidden="true" size={24} strokeWidth={1.8} />
              </span>
              <h1>Solicitudes de Ausencias</h1>
              <div className={styles.moduleActions}>
                <ButtonLink href="/ausencias/nueva" size="small">
                  <CalendarPlus aria-hidden="true" size={17} />
                  Nueva solicitud
                </ButtonLink>
              </div>
            </div>
          </div>
        </header>

        <section aria-label="Resumen de ausencias" className={styles.summaryCards}>
          <ElevatedSurface as="div" className={styles.summaryCard}>
            <span className={styles.summaryCardIcon} data-tone="vacation">
              <Umbrella aria-hidden="true" size={29} strokeWidth={1.8} />
            </span>
            <div className={styles.summaryCardContent}>
              <h2>Saldo de vacaciones</h2>
              <p className={styles.summaryMetric}>
                <strong>
                  {dashboard.balanceUnits === null
                    ? "—"
                    : formatPtoDays(dashboard.balanceUnits ?? 0)}
                </strong>
                <span>
                  {dashboard.balanceUnits === null
                    ? "saldo sin configurar"
                    : "días disponibles"}
                </span>
              </p>
            </div>
          </ElevatedSurface>

          <ElevatedSurface as="div" className={styles.summaryCard}>
            <span className={styles.summaryCardIcon} data-tone="pending">
              <Clock3 aria-hidden="true" size={29} strokeWidth={1.8} />
            </span>
            <div className={styles.summaryCardContent}>
              <h2>Solicitudes pendientes</h2>
              <p className={styles.summaryMetric}>
                <strong>{dashboard.pendingApprovals.length}</strong>
                <span>
                  {dashboard.pendingApprovals.length === 1
                    ? "solicitud"
                    : "solicitudes"}
                </span>
              </p>
            </div>
          </ElevatedSurface>
        </section>
      </div>
    </Container>
  );
}
