export type ProfileActionState = {
  errors?: Record<string, string>;
  message?: string;
  status: "error" | "idle" | "success";
};

export const initialProfileActionState: ProfileActionState = { status: "idle" };
