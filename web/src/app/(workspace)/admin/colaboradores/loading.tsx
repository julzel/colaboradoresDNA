import { Container } from "@/components/ui/container/container";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import styles from "@/features/employees/components/employee-management.module.css";

export default function EmployeeDirectoryLoading() {
  return (
    <Container>
      <main
        aria-busy="true"
        aria-label="Cargando colaboradores"
        className={styles.page}
        id="main-content"
      >
        <span className="sr-only" role="status">
          Cargando colaboradores…
        </span>
        <Skeleton height="4rem" />
        <Skeleton height="7rem" />
        <Skeleton height="24rem" />
      </main>
    </Container>
  );
}
