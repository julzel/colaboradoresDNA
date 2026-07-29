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
  items: readonly NavigationItem[];
  label?: string;
};

export function SideNavigation({
  currentHref,
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
                aria-current={isCurrent ? "page" : undefined}
                className={styles.link}
                href={item.href}
              >
                <Icon aria-hidden="true" className={styles.icon} size={18} />
                <span>{item.label}</span>
                {item.badge && <span className={styles.badge}>{item.badge}</span>}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
