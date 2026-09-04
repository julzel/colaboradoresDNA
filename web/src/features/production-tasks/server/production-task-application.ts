import "server-only";

// This is the only server entry point presentation adapters should import.
// Its exports are transport-neutral use cases; Next.js concerns stay in actions/routes.
export {
  archiveProductionAreaAsManager,
  archiveProductionTaskTemplateAsManager,
  completeProductionTaskForCurrentUser,
  copyProductionWeekAsManager,
  createProductionAreaAsManager,
  createProductionTaskTemplateAsManager,
  createProductionWeekDraftAsManager,
  getProductionPlanEditor,
  getProductionPlanningDashboard,
  getPublishedProductionBoard,
  getTodayProductionTaskSummary,
  markProductionAssignmentChangesReadForCurrentUser,
  publishProductionWeekAsManager,
  reopenProductionTaskForCurrentUser,
  saveProductionWeekDraftAsManager,
} from "@/features/production-tasks/server/production-task-service";
export {
  commitProductionImport,
  configureProductionImport,
  createProductionImportPreview,
  getProductionImportPreview,
} from "@/features/production-tasks/server/production-task-import-service";
export {
  createProductionPlanExportBuffer,
  createProductionTaskTemplateBuffer,
} from "@/features/production-tasks/server/production-task-template-service";
