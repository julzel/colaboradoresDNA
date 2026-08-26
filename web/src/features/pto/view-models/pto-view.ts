import type { PtoRequest } from "@/features/pto/domain/pto";

export type PtoRequestView = PtoRequest & {
  approverName: string | null;
  createdByName: string | null;
  requesterName: string;
};
