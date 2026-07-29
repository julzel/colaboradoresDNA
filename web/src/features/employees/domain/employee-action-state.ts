export type EmployeeActionState = {
  errors?: Record<string, string>;
  message?: string;
  status: "idle" | "error";
};

export type IdentificationRevealState = {
  status: "idle" | "error" | "success";
  value?: string;
};

export const initialEmployeeActionState: EmployeeActionState = { status: "idle" };
export const initialIdentificationRevealState: IdentificationRevealState = {
  status: "idle",
};
