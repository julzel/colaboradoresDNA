import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { PtoCategoryBadge } from "@/features/pto/components/pto-category-badge";
import { ptoCategories, ptoCategoryLabels } from "@/features/pto/domain/pto";

const expectedIconClasses = {
  vacation: "lucide-tree-palm",
  incapacity: "lucide-heart-pulse",
  maternity: "lucide-baby",
  paternity: "lucide-hand-heart",
  unpaid_leave: "lucide-wallet-cards",
  bereavement: "lucide-flower-2",
  other: "lucide-circle-ellipsis",
} as const;

describe("PTO category badge", () => {
  it.each(ptoCategories)("renders a labeled icon and color hook for %s", (category) => {
    const { container } = render(<PtoCategoryBadge category={category} />);

    expect(screen.getByText(ptoCategoryLabels[category])).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-category", category);
    expect(container.querySelector(`.${expectedIconClasses[category]}`)).not.toBeNull();
  });

  it("renders a safe icon and label for a legacy category", () => {
    const { container } = render(<PtoCategoryBadge category={"sick" as never} />);

    expect(screen.getByText("Incapacidad")).toBeInTheDocument();
    expect(container.firstElementChild).toHaveAttribute("data-category", "incapacity");
    expect(container.querySelector(".lucide-heart-pulse")).not.toBeNull();
  });
});
