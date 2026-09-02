import {
  ArrowRight,
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ClipboardCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import styles from "./administrator-module-links.module.css";

const administratorModules = [
  {
    description: "Consultá, agregá y actualizá la información del equipo.",
    href: "/admin/colaboradores",
    icon: UsersRound,
    label: "Colaboradores",
    tone: "brand",
  },
  {
    description: "Consultá y organizá las jornadas de trabajo del equipo.",
    href: "/admin/horarios",
    icon: CalendarClock,
    label: "Horarios",
    tone: "schedule",
  },
  {
    description: "Revisá y gestioná las solicitudes de ausencia pendientes.",
    href: "/admin/ausencias",
    icon: ClipboardCheck,
    label: "Aprobar ausencias",
    tone: "accent",
  },
  {
    description: "Priorizá seguimientos, documentá 1:1 y cerrá acciones acordadas.",
    href: "/admin/desarrollo",
    icon: ChartNoAxesColumnIncreasing,
    label: "Desarrollo",
    tone: "development",
  },
  {
    description: "Administrá invitaciones, acceso, roles y seguridad.",
    href: "/admin/accounts",
    icon: ShieldCheck,
    label: "Cuentas y acceso",
    tone: "security",
  },
] as const;

type AdministratorModuleLinksProps = {
  titleAs?: "h1" | "h2";
};

export function AdministratorModuleLinks({
  titleAs: Title = "h2",
}: AdministratorModuleLinksProps) {
  return (
    <section aria-labelledby="administrator-modules-title" className={styles.section}>
      <header className={styles.header}>
        <p className="eyebrow">Administración</p>
        <Title id="administrator-modules-title">Módulos de administración</Title>
      </header>

      <ul className={styles.moduleGrid}>
        {administratorModules.map((module) => {
          const Icon = module.icon;

          return (
            <li key={module.href}>
              <Link className={styles.moduleCard} href={module.href}>
                <span className={styles.moduleIcon} data-tone={module.tone}>
                  <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
                </span>
                <span className={styles.moduleContent}>
                  <strong>{module.label}</strong>
                  <span>{module.description}</span>
                </span>
                <ArrowRight aria-hidden="true" className={styles.arrow} size={20} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
