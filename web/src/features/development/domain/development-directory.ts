import type { EmploymentStatus } from "@/features/employees/domain/employee";

export type DevelopmentDirectoryStatus = "current" | "due" | "never";

export type DevelopmentDirectoryItem = {
  activeGoalCount: number;
  assessedSkillCount: number;
  departmentName: string | null;
  displayName: string;
  employmentStatus: EmploymentStatus;
  employeeId: string;
  lastFinalizedOneOnOneOn: string | null;
  nextOneOnOneDueOn: string | null;
  openActionCount: number;
  overdueActionCount: number;
  overdueGoalCount: number;
  positionTitle: string | null;
};

export type DevelopmentDirectory = {
  items: DevelopmentDirectoryItem[];
  today: string;
};

export function getDevelopmentDirectoryStatus(
  item: Pick<DevelopmentDirectoryItem, "lastFinalizedOneOnOneOn" | "nextOneOnOneDueOn">,
  today: string,
): DevelopmentDirectoryStatus {
  if (!item.lastFinalizedOneOnOneOn) return "never";
  if (item.nextOneOnOneDueOn && item.nextOneOnOneDueOn < today) return "due";
  return "current";
}
