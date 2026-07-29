import Link from "next/link";

import styles from "./side-navigation.module.css";

export type NavigationItem = {
  badge?: string;
  href: string;
  label: string;
  marker: string;
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

          return (
            <li key={item.label}>
              <Link
                aria-current={isCurrent ? "page" : undefined}
                className={styles.link}
                href={item.href}
              >
                <span className={styles.marker} aria-hidden="true">
                  {item.marker}
                </span>
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
