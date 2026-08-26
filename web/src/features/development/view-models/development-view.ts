import type { EmploymentStatus } from "@/features/employees/domain/employee";

export type DevelopmentEmployeeReference = {
  employmentStatus: EmploymentStatus;
  id: string;
};

export type DevelopmentEmployeeIdentity = DevelopmentEmployeeReference & {
  departmentName: string | null;
  displayName: string;
  initials: string;
  platformUserId: string;
  positionTitle: string | null;
};

export type DevelopmentRecordSummary = {
  activeGoalCount: number;
  assessedSkillCount: number;
  employeeId: string;
  lastFinalizedOneOnOneOn: string | null;
  nextOneOnOneDueOn: string | null;
  oneOnOneCadenceDays: number | null;
  openActionCount: number;
  overdueActionCount: number;
  overdueGoalCount: number;
};
