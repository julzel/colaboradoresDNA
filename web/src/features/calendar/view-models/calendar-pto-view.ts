import type { PtoCategory } from "@/features/pto/domain/pto";

export type CalendarPtoQuickDetail = {
  canViewRequest?: boolean;
  category: PtoCategory;
  categoryLabel: string;
  durationLabel: string;
  endDate: string;
  id: string;
  requesterName: string;
  startDate: string;
  statusLabel: string;
};
