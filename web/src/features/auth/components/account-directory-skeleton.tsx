import { Card, CardBody } from "@/components/ui/card/card";
import { LoadingRegion, Skeleton } from "@/components/ui/feedback/skeleton";

import styles from "./account-directory-skeleton.module.css";

export function AccountDirectorySkeleton() {
  return (
    <Card className={styles.card}>
      <LoadingRegion label="Cargando directorio de acceso">
        <div className={styles.header}>
          <Skeleton variant="line" width="10rem" />
          <Skeleton variant="line" width="17rem" />
        </div>
        <CardBody className={styles.rows}>
          {Array.from({ length: 4 }, (_, index) => (
            <div className={styles.row} key={index}>
              <div className={styles.person}>
                <Skeleton variant="circle" width="2.25rem" />
                <div>
                  <Skeleton variant="line" width="8rem" />
                  <Skeleton variant="line" width="11rem" />
                </div>
              </div>
              <Skeleton variant="line" width="5rem" />
              <Skeleton height="2.25rem" width="6rem" />
            </div>
          ))}
        </CardBody>
      </LoadingRegion>
    </Card>
  );
}
