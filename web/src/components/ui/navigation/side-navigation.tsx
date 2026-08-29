import Link from "next/link";
import type { LucideIcon } from "lucide-react";

import styles from "./side-navigation.module.css";

export type NavigationItem = {
  badge?: string;
  href: string;
  icon: LucideIcon;
  label: string;
};

type SideNavigationProps = {
  currentHref: string;
  expanded?: boolean;
  items: readonly NavigationItem[];
  label?: string;
};

export function SideNavigation({
  currentHref,
  expanded = false,
  items,
  label = "Navegación principal",
}: SideNavigationProps) {
  return (
    <nav aria-label={label}>
      <ul className={styles.list}>
        {items.map((item) => {
          const isCurrent = item.href === currentHref;
          const Icon = item.icon;

          return (
            <li key={item.label}>
              <Link
                aria-label={
                  item.badge
                    ? `${item.label}, ${item.badge} notificaciones sin leer`
                    : item.label
                }
                aria-current={isCurrent ? "page" : undefined}
                className={`${styles.link} ${expanded ? styles.linkExpanded : ""}`}
                href={item.href}
                title={item.label}
              >
                <Icon aria-hidden="true" className={styles.icon} size={18} />
                <span className={styles.label}>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
