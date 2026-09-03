export type SchedulerActionState = {
  errors?: Record<string, string>;
  message?: string;
  status: "error" | "idle";
};

export const initialSchedulerActionState: SchedulerActionState = { status: "idle" };
