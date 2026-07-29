import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { EmployeeDirectoryFilters } from "@/features/employees/components/employee-directory-filters";
import { EmployeeDirectoryMobileList } from "@/features/employees/components/employee-directory-mobile-list";
import { EmployeeDirectoryTable } from "@/features/employees/components/employee-directory-table";
import styles from "@/features/employees/components/employee-management.module.css";
import {
  createEmployeeDirectoryUrl,
  parseEmployeeDirectoryQuery,
} from "@/features/employees/domain/employee-directory-query";
import { listDepartments } from "@/features/employees/server/department-repository";
import { listEmployeeDirectoryForAdministration } from "@/features/employees/server/employee-read-repository";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

export const metadata: Metadata = { title: "Colaboradores" };

export default async function EmployeeDirectoryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requirePlatformUser({ roles: ["administrator"] });
  const query = parseEmployeeDirectoryQuery(await searchParams);
  const [directory, departments] = await Promise.all([
    listEmployeeDirectoryForAdministration(query),
    listDepartments({ includeInactive: true }),
  ]);
  const hasFilters = Boolean(
    query.search || query.department || query.employment || query.access || query.role,
  );

  return (
    <Container>
      <main className={styles.page} id="main-content">
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Colaboradores</h1>
            <p>Gestioná información laboral, horarios y acceso a la plataforma.</p>
          </div>
          <ButtonLink href="/admin/colaboradores/nuevo">Nuevo colaborador</ButtonLink>
        </header>

        <EmployeeDirectoryFilters departments={departments} query={query} />

        {directory.total === 0 ? (
          <section className={styles.empty}>
            <h2>
              {hasFilters
                ? "No encontramos resultados con estos filtros"
                : "No hay colaboradores registrados"}
            </h2>
            <p className={styles.muted}>
              {hasFilters
                ? "Probá cambiando o limpiando los filtros."
                : "Creá el primer registro para comenzar."}
            </p>
          </section>
        ) : (
          <>
            <p aria-live="polite" className={styles.muted}>
              {directory.total}{" "}
              {directory.total === 1
                ? "colaborador encontrado"
                : "colaboradores encontrados"}
            </p>
            <EmployeeDirectoryTable items={directory.items} />
            <EmployeeDirectoryMobileList items={directory.items} />
            <nav aria-label="Paginación" className={styles.pagination}>
              <span>
                Página {directory.page} de {directory.pageCount}
              </span>
              <div className={styles.actions}>
                {directory.page > 1 && (
                  <ButtonLink
                    href={createEmployeeDirectoryUrl(query, directory.page - 1)}
                    variant="secondary"
                  >
                    Anterior
                  </ButtonLink>
                )}
                {directory.page < directory.pageCount && (
                  <ButtonLink
                    href={createEmployeeDirectoryUrl(query, directory.page + 1)}
                    variant="secondary"
                  >
                    Siguiente
                  </ButtonLink>
                )}
              </div>
            </nav>
          </>
        )}
      </main>
    </Container>
  );
}
