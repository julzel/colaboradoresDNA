import type { Metadata } from "next";
import { ArrowRight, ClipboardClock, Users } from "lucide-react";
import Link from "next/link";

import { Container } from "@/components/ui/container/container";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";

import styles from "./admin.module.css";

export const metadata: Metadata = { title: "Administración" };

const adminModules = [
  {
    description:
      "Revisá y gestioná las solicitudes de ausencia de toda la organización.",
    href: "/admin/ausencias",
    icon: ClipboardClock,
    label: "Gestionar Ausencias",
    tone: "accent",
  },
  {
    description: "Consultá, agregá y actualizá la información de los colaboradores.",
    href: "/admin/colaboradores",
    icon: Users,
    label: "Colaboradores",
    tone: "brand",
  },
] as const;

export default async function AdministrationPage() {
  await requirePlatformUser({ roles: ["administrator"] });

  return (
    <Container>
      <section aria-label="Módulos administrativos" className={styles.page}>
        <ul className={styles.moduleGrid}>
          {adminModules.map((module) => {
            const Icon = module.icon;

            return (
              <li key={module.href}>
                <Link className={styles.moduleCard} href={module.href}>
                  <span className={styles.moduleIcon} data-tone={module.tone}>
                    <Icon aria-hidden="true" size={26} strokeWidth={1.8} />
                  </span>
                  <span className={styles.moduleContent}>
                    <strong>{module.label}</strong>
                    <span>{module.description}</span>
                  </span>
                  <ArrowRight aria-hidden="true" className={styles.arrow} size={21} />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>
    </Container>
  );
}
