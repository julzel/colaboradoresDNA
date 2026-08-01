import type { Metadata } from "next";
import Link from "next/link";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import { StatusBadge } from "@/components/ui/status-badge/status-badge";
import styles from "@/features/pto/components/pto.module.css";
import {
  formatPtoDays,
  ptoCategoryLabels,
  ptoStatusLabels,
} from "@/features/pto/domain/pto";
import {
  getPtoDashboard,
  type PtoRequestView,
} from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Solicitudes de ausencia" };

const statusTones = {
  approved: "success",
  cancelled: "neutral",
  denied: "danger",
  draft: "neutral",
  pending: "warning",
} as const;

function RequestList({
  empty,
  requests,
}: {
  empty: string;
  requests: PtoRequestView[];
}) {
  if (!requests.length) return <p className={styles.muted}>{empty}</p>;
  return (
    <ul className={styles.list}>
      {requests.map((request) => (
        <li className={styles.requestItem} key={request.id}>
          <div>
            <Link className={styles.requestLink} href={`/ausencias/${request.id}`}>
              {request.requesterName} · {ptoCategoryLabels[request.category]}
            </Link>
            <p className={styles.muted}>
              {request.startDate} a {request.endDate} ·{" "}
              {formatPtoDays(request.durationUnits)} días
            </p>
          </div>
          <StatusBadge tone={statusTones[request.status]}>
            {ptoStatusLabels[request.status]}
          </StatusBadge>
        </li>
      ))}
    </ul>
  );
}

export default async function PtoDashboardPage() {
  const dashboard = await getPtoDashboard();
  return (
    <Container>
      <main className={styles.page} id="main-content">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Cuenta personal</p>
            <h1>Solicitudes de ausencia</h1>
            <p>Consultá tu saldo y administrá tus solicitudes.</p>
          </div>
          <div className={styles.actions}>
            {dashboard.canRequest && (
              <ButtonLink href="/ausencias/nueva">Nueva solicitud</ButtonLink>
            )}
            {dashboard.canManage && (
              <ButtonLink href="/admin/ausencias" variant="secondary">
                Administrar solicitudes
              </ButtonLink>
            )}
          </div>
        </header>

        <div className={styles.summaryGrid}>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Saldo disponible</p>
            <p className={styles.metric}>
              {!dashboard.canRequest
                ? "No aplica"
                : dashboard.balanceUnits === null
                  ? "Sin configurar"
                  : `${formatPtoDays(dashboard.balanceUnits)} días`}
            </p>
          </ElevatedSurface>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Mis pendientes</p>
            <p className={styles.metric}>
              {
                dashboard.ownRequests.filter((request) => request.status === "pending")
                  .length
              }
            </p>
          </ElevatedSurface>
          <ElevatedSurface className={styles.card}>
            <p className="eyebrow">Por revisar</p>
            <p className={styles.metric}>{dashboard.pendingApprovals.length}</p>
          </ElevatedSurface>
        </div>

        <div className={styles.twoColumns}>
          <ElevatedSurface as="section" className={styles.card}>
            <div className={styles.sectionHeader}>
              <h2>Mis solicitudes</h2>
              {dashboard.canRequest && (
                <ButtonLink href="/ausencias/nueva" size="small" variant="secondary">
                  Crear
                </ButtonLink>
              )}
            </div>
            <RequestList
              empty="Todavía no tenés solicitudes."
              requests={dashboard.ownRequests}
            />
          </ElevatedSurface>
          <ElevatedSurface as="section" className={styles.card}>
            <h2>Solicitudes por revisar</h2>
            <RequestList
              empty="No tenés solicitudes pendientes de revisión."
              requests={dashboard.pendingApprovals}
            />
          </ElevatedSurface>
        </div>
      </main>
    </Container>
  );
}
