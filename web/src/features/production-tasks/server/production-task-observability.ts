import "server-only";

import { ProductionTaskDomainError } from "@/features/production-tasks/domain/shared";

const safeImportCodes = new Set([
  "active_content",
  "file_too_large",
  "invalid_workbook",
  "limits_exceeded",
  "missing_headers",
  "no_task_sheets",
]);

type ProductionOperation =
  | "completion"
  | "import_commit"
  | "import_preview"
  | "publication"
  | "reopen";

export async function observeProductionOperation<T>(
  operation: ProductionOperation,
  callback: () => Promise<T>,
  itemCount?: number,
) {
  const startedAt = performance.now();
  try {
    const result = await callback();
    console.info(
      JSON.stringify({
        durationMs: Math.round(performance.now() - startedAt),
        ...(itemCount === undefined ? {} : { itemCount }),
        operation,
        outcome: "success",
        scope: "production_tasks",
      }),
    );
    return result;
  } catch (error) {
    console.warn(
      JSON.stringify({
        code:
          error instanceof ProductionTaskDomainError
            ? error.code
            : error &&
                typeof error === "object" &&
                "code" in error &&
                safeImportCodes.has(String(error.code))
              ? String(error.code)
              : "unexpected",
        durationMs: Math.round(performance.now() - startedAt),
        ...(itemCount === undefined ? {} : { itemCount }),
        operation,
        outcome: "failure",
        scope: "production_tasks",
      }),
    );
    throw error;
  }
}
