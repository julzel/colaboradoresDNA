import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";

import styles from "./workspace-loading.module.css";

export function WorkspaceLoading() {
  return (
    <LoadingRegion className={styles.loading ?? ""} label="Cargando página">
      <div className={styles.heading}>
        <Skeleton variant="line" width="7rem" />
        <Skeleton height="2.5rem" variant="line" width="min(28rem, 80%)" />
        <Skeleton variant="line" width="min(36rem, 100%)" />
      </div>
      <div className={styles.grid}>
        <Skeleton height="15rem" />
        <Skeleton height="15rem" />
      </div>
    </LoadingRegion>
  );
}
