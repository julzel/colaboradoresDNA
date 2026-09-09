export type LeaveConflict = {
  id: string;
  category: string;
  startDate: string;
  endDate: string;
  status: string;
};
export class LeaveConflictError extends Error {
  constructor(public readonly conflicts: LeaveConflict[]) {
    super(
      "La solicitud coincide con otra ausencia. Cambiá las fechas o cancelá la solicitud existente.",
    );
  }
}
