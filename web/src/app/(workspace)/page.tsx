import { AdministratorModuleLinks } from "@/components/admin/administrator-module-links/administrator-module-links";
import { Container } from "@/components/ui/container/container";
import { getCalendarDashboardOverview } from "@/features/calendar/server/calendar-service";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import styles from "@/features/dashboard/components/dashboard.module.css";
import { DashboardHighlights } from "@/features/dashboard/components/dashboard-highlights";
import { DashboardWelcome } from "@/features/dashboard/components/dashboard-welcome";
import { getDashboardDate } from "@/features/dashboard/domain/dashboard-date";
import { Suspense } from "react";
import { HomeTasks } from "@/features/production-tasks/components/home-tasks";

export default async function HomePage() {
  const { platformUser: dashboard } = await requirePlatformUser();
  const showAgenda = dashboard.role !== "collaborator";
  const overview = await getCalendarDashboardOverview({ includeAgenda: showAgenda });
  const dashboardDate = getDashboardDate();

  return (
    <div className={styles.page}>
      <Container>
        <DashboardWelcome date={dashboardDate} displayName={dashboard.displayName} />
      </Container>

      <Container>
        <DashboardHighlights {...overview} showAgenda={showAgenda} />
      </Container>

      {dashboard.role === "administrator" && (
        <Container>
          <AdministratorModuleLinks />
        </Container>
      )}
      <Container>
        <Suspense fallback={<p role="status">Cargando mis tareas…</p>}>
          <HomeTasks />
        </Suspense>
      </Container>
    </div>
  );
}
