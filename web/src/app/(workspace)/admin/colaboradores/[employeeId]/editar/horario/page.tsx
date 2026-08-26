import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { Container } from "@/components/ui/container/container";
import { BackLink } from "@/components/ui/navigation/back-link";
import { ScheduleForm } from "@/features/employees/components/schedule-form";
import styles from "@/features/employees/components/employee-management.module.css";
import {
  dayOfWeekOrder,
  type ScheduledDay,
} from "@/features/employees/domain/schedule";
import { getEmployeeSchedulePageData } from "@/features/employees/server/employee-query-service";

export const metadata: Metadata = { title: "Cambiar horario" };

export default async function EditSchedulePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  const { employeeId } = await params;
  const detail = await getEmployeeSchedulePageData(employeeId);
  if (!detail) notFound();
  const initialDays: ScheduledDay[] =
    detail.currentSchedule?.days ??
    dayOfWeekOrder.map((dayOfWeek) => ({
      dayOfWeek,
      halfDayPeriod: null,
      workFraction: 0,
    }));

  return (
    <Container>
      <div className={styles.page}>
        <BackLink href={`/admin/colaboradores/${employeeId}`}>
          Volver al detalle
        </BackLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Colaborador</p>
            <h1>Cambiar horario</h1>
            <p>El horario anterior se conservará en el historial.</p>
          </div>
        </header>
        <ScheduleForm employeeId={employeeId} initialDays={initialDays} />
      </div>
    </Container>
  );
}
