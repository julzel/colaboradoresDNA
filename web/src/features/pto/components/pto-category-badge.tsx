import {
  Baby,
  CircleEllipsis,
  Flower2,
  HandHeart,
  HeartPulse,
  TreePalm,
  WalletCards,
  type LucideIcon,
} from "lucide-react";

import {
  normalizePtoCategory,
  ptoCategoryLabels,
  type PtoCategory,
} from "@/features/pto/domain/pto";

import styles from "./pto.module.css";

export const ptoCategoryIcons: Record<PtoCategory, LucideIcon> = {
  vacation: TreePalm,
  incapacity: HeartPulse,
  maternity: Baby,
  paternity: HandHeart,
  unpaid_leave: WalletCards,
  bereavement: Flower2,
  other: CircleEllipsis,
};

export function PtoCategoryBadge({
  category,
  size = "default",
}: {
  category: PtoCategory;
  size?: "default" | "large";
}) {
  const normalizedCategory = normalizePtoCategory(category);
  const Icon = ptoCategoryIcons[normalizedCategory] ?? CircleEllipsis;
  return (
    <span
      className={styles.categoryBadge}
      data-category={normalizedCategory}
      data-size={size}
    >
      <Icon aria-hidden="true" size={size === "large" ? 24 : 16} />
      <span>{ptoCategoryLabels[normalizedCategory]}</span>
    </span>
  );
}

export function PtoCategoryIcon({ category }: { category: PtoCategory }) {
  const normalizedCategory = normalizePtoCategory(category);
  const Icon = ptoCategoryIcons[normalizedCategory] ?? CircleEllipsis;
  return (
    <span
      aria-hidden="true"
      className={styles.categoryIcon}
      data-category={normalizedCategory}
    >
      <Icon color="var(--category-color)" size={20} />
    </span>
  );
}
