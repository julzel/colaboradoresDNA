import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";
import { Modal } from "@/components/ui/modal/modal";
import styles from "@/features/pto/components/pto.module.css";

export default function PtoRequestDetailModalLoading() {
  return (
    <Modal
      description="Obteniendo la información más reciente"
      title="Cargando solicitud"
    >
      <LoadingRegion
        className={styles.requestDetailLoading ?? ""}
        label="Cargando detalle de la solicitud"
      >
        <div className={styles.requestDetailLoadingSummary}>
          <Skeleton height="2.5rem" variant="line" width="12rem" />
          <Skeleton height="1.625rem" variant="line" width="6rem" />
        </div>
        <Skeleton height="18rem" />
        <Skeleton height="10rem" />
      </LoadingRegion>
    </Modal>
  );
}
