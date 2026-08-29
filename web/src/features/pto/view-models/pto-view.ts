import type { PtoRequest } from "@/features/pto/domain/pto";

export type PtoRequestView = PtoRequest & {
  approverName: string | null;
  createdByName: string | null;
  requesterName: string;
};

export type PtoRequestDetailView = {
  canCancel: boolean;
  canDecide: boolean;
  canEdit: boolean;
  canReassign: boolean;
  canSubmit: boolean;
  history: Array<{
    actorName: string;
    from: PtoRequest["status"] | null;
    occurredAt: Date;
    to: PtoRequest["status"];
  }>;
  proxyEmployeeId: string | null;
  reassignmentOptions: Array<{ displayName: string; id: string }>;
  request: PtoRequestView;
  warnings: {
    hasOverlap: boolean;
    projectedBalanceUnits: number | null;
    wouldBeNegative: boolean;
  };
};
