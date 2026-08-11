import { Container } from "@/components/ui/container/container";
import { Skeleton } from "@/components/ui/feedback/skeleton";
import styles from "@/features/employees/components/employee-management.module.css";

export default function EmployeeDirectoryLoading() {
  return (
    <Container>
      <div aria-busy="true" className={styles.page}>
        <span className="sr-only" role="status">
          Cargando colaboradores…
        </span>
        <Skeleton height="4rem" />
        <Skeleton height="7rem" />
        <Skeleton height="24rem" />
      </div>
    </Container>
  );
}
