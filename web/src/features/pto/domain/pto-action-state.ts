export type PtoActionState = {
  conflicts?: import("./leave-conflict").LeaveConflict[];
  errors?: Record<string, string>;
  message?: string;
  requiresConfirmation?: boolean;
  status: "idle" | "error" | "warning";
};

export const initialPtoActionState: PtoActionState = { status: "idle" };
