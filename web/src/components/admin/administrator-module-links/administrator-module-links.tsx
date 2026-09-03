import {
  CalendarClock,
  ChartNoAxesColumnIncreasing,
  ChevronRight,
  ClipboardCheck,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import styles from "./administrator-module-links.module.css";

const administratorModules = [
  {
    href: "/admin/colaboradores",
    icon: UsersRound,
    label: "Colaboradores",
  },
  {
    href: "/admin/horarios",
    icon: CalendarClock,
    label: "Horarios",
  },
  {
    href: "/admin/ausencias",
    icon: ClipboardCheck,
    label: "Aprobar ausencias",
  },
  {
    href: "/admin/desarrollo",
    icon: ChartNoAxesColumnIncreasing,
    label: "Desarrollo",
  },
  {
    href: "/admin/accounts",
    icon: ShieldCheck,
    label: "Cuentas y acceso",
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
                <span className={styles.moduleIcon}>
                  <Icon aria-hidden="true" size={24} strokeWidth={1.8} />
                </span>
                <span className={styles.moduleContent}>
                  <strong>{module.label}</strong>
                </span>
                <ChevronRight aria-hidden="true" className={styles.arrow} size={20} />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
