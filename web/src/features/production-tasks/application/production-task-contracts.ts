import type { ProductionTaskRevisionChangeType } from "@/features/production-tasks/domain/production-task-revision";

export type ProductionTaskStatus = "pending" | "completed";
export type ProductionPlanStatus = "draft" | "published" | "superseded";

export type ProductionTaskAreaDto = {
  id: string;
  name: string;
  sortOrder: number;
};

export type ProductionTaskEmployeeDto = {
  displayName: string;
  email: string;
  employeeCode: string | null;
  id: string;
};

export type ProductionTaskTemplateDto = {
  areaId: string;
  areaName: string;
  description: string;
  id: string;
  subject: string;
};

export type ProductionTaskAvailabilityWarning =
  | "approved_leave"
  | "not_scheduled"
  | "availability_unknown";

export type ProductionPlanEditorResult = {
  areas: ProductionTaskAreaDto[];
  employees: ProductionTaskEmployeeDto[];
  plan: {
    id: string;
    revision: number;
    status: ProductionPlanStatus;
    tasks: Array<{
      areaId: string;
      assigneeEmployeeIds: string[];
      description: string;
      id: string;
      sortOrder: number;
      status: ProductionTaskStatus;
      subject: string;
      warnings: ProductionTaskAvailabilityWarning[];
      workDate: string;
    }>;
    version: number;
    weekEnd: string;
    weekStart: string;
  };
  revisionChanges: Array<{
    affectedEmployeeIds: string[];
    description: string;
    taskId: string;
    type: ProductionTaskRevisionChangeType;
  }>;
  templates: ProductionTaskTemplateDto[];
};

export type ProductionPlanningDashboardResult = {
  areas: ProductionTaskAreaDto[];
  plans: Array<{
    assigneeCount: number;
    blockingErrorCount: number;
    completedTaskCount: number;
    id: string;
    revision: number;
    status: ProductionPlanStatus;
    taskCount: number;
    updatedAt: string;
    version: number;
    weekEnd: string;
    weekStart: string;
  }>;
  templates: ProductionTaskTemplateDto[];
};

export type ProductionBoardQuery = {
  areaId?: string | null;
  assigneeId?: string | null;
  date?: string;
  status?: ProductionTaskStatus | null;
  view?: "day" | "week";
};

export type ProductionBoardResult = {
  areas: ProductionTaskAreaDto[];
  canManage: boolean;
  currentEmployeeId: string | null;
  employees: ProductionTaskEmployeeDto[];
  plan: {
    id: string;
    revision: number;
  } | null;
  query: {
    areaId: string | null;
    assigneeId: string | null;
    selectedDate: string;
    status: ProductionTaskStatus | null;
    view: "day" | "week";
    weekEnd: string;
    weekStart: string;
  };
  tasks: Array<{
    areaId: string;
    areaName: string;
    assigneeEmployeeIds: string[];
    completedAt: string | null;
    completedByEmployeeId: string | null;
    description: string;
    id: string;
    permissions: {
      complete: boolean;
      reopen: boolean;
      undoCompletion: boolean;
    };
    planId: string;
    sortOrder: number;
    status: ProductionTaskStatus;
    subject: string | null;
    version: number;
    workDate: string;
  }>;
  today: string;
};

export type TodayProductionTaskSummaryResult = {
  assignmentChanges: {
    count: number;
    weekStart: string | null;
  };
  completedCount: number;
  employees: ProductionTaskEmployeeDto[];
  pendingCount: number;
  tasks: ProductionBoardResult["tasks"];
};

export type ProductionImportIssueCode =
  | "week_missing"
  | "day_unknown"
  | "area_unknown"
  | "task_missing"
  | "task_too_long"
  | "subject_too_long"
  | "assignee_missing"
  | "assignee_unknown"
  | "formula_ignored"
  | "duplicate";

export type ProductionImportPreviewResult = {
  areas: ProductionTaskAreaDto[];
  canCommit: boolean;
  employees: ProductionTaskEmployeeDto[];
  expiresAt: string;
  fileName: string;
  id: string;
  sheets: Array<{
    errorCount: number;
    mode: "merge" | "replace";
    name: string;
    rows: Array<{
      areaId: string | null;
      areaText: string;
      assigneeEmployeeIds: string[];
      assigneeTexts: string[];
      dayText: string;
      description: string;
      issues: Array<{
        code: ProductionImportIssueCode;
        tone: "error" | "warning";
      }>;
      key: string;
      rowNumber: number;
      status: "error" | "skipped" | "valid";
      subject: string;
      workDate: string | null;
    }>;
    selected: boolean;
    validCount: number;
    warningCount: number;
    weekStart: string | null;
  }>;
  version: number;
};
