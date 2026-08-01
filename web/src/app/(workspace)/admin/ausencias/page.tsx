import type { Metadata } from "next";

import { ButtonLink } from "@/components/ui/button/button";
import { Container } from "@/components/ui/container/container";
import { ElevatedSurface } from "@/components/ui/elevated-surface/elevated-surface";
import styles from "@/features/pto/components/pto.module.css";
import { PtoSettingsForm } from "@/features/pto/components/pto-settings-form";
import { getPtoAdministrationSettings } from "@/features/pto/server/pto-service";

export const metadata: Metadata = { title: "Configuración de ausencias" };

export default async function PtoAdministrationPage() {
  const settings = await getPtoAdministrationSettings();
  return (
    <Container>
      <main className={styles.page} id="main-content">
        <ButtonLink href="/ausencias" size="small" variant="quiet">
          ← Volver a solicitudes
        </ButtonLink>
        <header className={styles.header}>
          <div>
            <p className="eyebrow">Administración</p>
            <h1>Configuración de ausencias</h1>
            <p>Definí la ruta especial de aprobación para supervisores.</p>
          </div>
        </header>
        <ElevatedSurface as="section" className={styles.card}>
          <h2>Aprobación de supervisores</h2>
          <p className={styles.muted}>
            Configurá aquí la cuenta de Yerlin Marquez. Se guarda por identificador
            estable, no por nombre.
          </p>
          <PtoSettingsForm
            options={settings.options}
            selectedId={settings.selectedId}
          />
        </ElevatedSurface>
      </main>
    </Container>
  );
}
