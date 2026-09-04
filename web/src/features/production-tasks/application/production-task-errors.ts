export type ProductionWorkbookParseErrorCode =
  | "active_content"
  | "file_too_large"
  | "invalid_workbook"
  | "limits_exceeded"
  | "missing_headers"
  | "no_task_sheets";

export class ProductionWorkbookParseError extends Error {
  constructor(public readonly code: ProductionWorkbookParseErrorCode) {
    super(code);
    this.name = "ProductionWorkbookParseError";
  }
}
