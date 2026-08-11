export type DevelopmentActionState = {
  errors?: Record<string, string>;
  message?: string;
  status: "error" | "idle";
};

export const initialDevelopmentActionState: DevelopmentActionState = {
  status: "idle",
};
