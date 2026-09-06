import type {
  ProductionBoardQuery,
  ProductionBoardResult,
  ProductionImportPreviewResult,
  ProductionPlanEditorResult,
  ProductionPlanningDashboardResult,
  TodayProductionTaskSummaryResult,
} from "@/features/production-tasks/application/production-task-contracts";

/** Stable, transport-neutral contract exposed by the Tasks application core. */
export interface ProductionTaskApplicationApi {
  getPublishedProductionBoard(
    query?: ProductionBoardQuery,
  ): Promise<ProductionBoardResult>;
  getProductionImportPreview(
    previewId: string,
  ): Promise<ProductionImportPreviewResult | null>;
  getProductionPlanEditor(planId: string): Promise<ProductionPlanEditorResult | null>;
  getProductionPlanningDashboard(): Promise<ProductionPlanningDashboardResult>;
  getTodayProductionTaskSummary(): Promise<TodayProductionTaskSummaryResult>;
}
