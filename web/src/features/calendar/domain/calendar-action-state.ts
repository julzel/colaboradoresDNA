export type CalendarActionState = {
  errors?: Record<string, string>;
  message?: string;
  status: "idle" | "error";
};

export const initialCalendarActionState: CalendarActionState = {
  status: "idle",
};
