import "server-only";

import { z } from "zod";
import { getIdentitySession } from "@/features/auth/server/auth-provider";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import * as tasks from "../server/production-task-application";
import { ProductionTaskDomainError, productionObjectIdSchema } from "../domain/shared";
import { ProductionWorkbookParseError } from "../application/production-task-errors";
import { taskErrorMessage } from "../presentation/messages";
import { TaskAvailabilityError } from "../domain/production-task-edit";

const privateHeaders = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
const response = (data: unknown, status = 200) =>
  Response.json(data, { status, headers: privateHeaders });

export async function readTaskBody(request: Request, limit: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new ProductionWorkbookParseError("invalid_workbook");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    bytes += value.length;
    if (bytes > limit) {
      await reader.cancel();
      throw new ProductionWorkbookParseError("file_too_large");
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function jsonBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new ProductionTaskDomainError("import_invalid");
  try {
    return JSON.parse(
      (await readTaskBody(request, 1024 * 1024)).toString("utf8"),
    ) as unknown;
  } catch (error) {
    if (error instanceof ProductionWorkbookParseError) throw error;
    throw new ProductionTaskDomainError("import_invalid");
  }
}

export async function productionTaskHttp(request: Request, path: string[]) {
  try {
    if (!(await getIdentitySession()))
      return response(
        { code: "unauthenticated", error: "Iniciá sesión para continuar." },
        401,
      );
    await requirePlatformUser();
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !==
        new URL(process.env.APP_BASE_URL || request.url).origin ||
        request.headers.get("sec-fetch-site") === "cross-site")
    ) {
      return response(
        { code: "forbidden", error: "La solicitud debe venir de esta aplicación." },
        403,
      );
    }
    const route = path.join("/");
    const url = new URL(request.url);
    if (request.method === "GET") {
      if (route === "tasks/options")
        return response({
          data: await tasks.getProductionTaskEditOptions(
            url.searchParams.get("date") ?? "",
          ),
        });
      if (route === "board") {
        const query = z
          .object({
            date: z.string().optional(),
            view: z.enum(["day", "week"]).default("week"),
            areaId: z.string().optional(),
            assigneeId: z.string().optional(),
          })
          .parse(Object.fromEntries(url.searchParams));
        return response({
          data: await tasks.getPublishedProductionBoard({
            view: query.view,
            ...(query.date ? { date: query.date } : {}),
            areaId: query.areaId ?? null,
            assigneeId: query.assigneeId ?? null,
          }),
        });
      }
      if (route === "plans")
        return response({
          data: await tasks.getProductionPlanningDashboard(
            url.searchParams.get("date") ?? undefined,
          ),
        });
      if (path[0] === "plans" && path.length === 2) {
        const data = await tasks.getProductionPlanEditor(path[1]!);
        return data
          ? response({ data })
          : response({ error: "No encontramos la semana." }, 404);
      }
      if (route === "template") {
        const data = await tasks.createProductionTaskTemplateBuffer();
        return new Response(new Uint8Array(data), {
          headers: {
            ...privateHeaders,
            "Content-Type":
              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "Content-Disposition": 'attachment; filename="plantilla-tareas.xlsx"',
          },
        });
      }
      if (path[0] === "imports" && path.length === 2) {
        const data = await tasks.getProductionImportPreview(path[1]!);
        return data
          ? response({ data })
          : response(
              { code: "import_expired", error: taskErrorMessage("import_expired") },
              404,
            );
      }
    }
    if (request.method === "POST") {
      // Authorize management before reading or parsing an expensive upload.
      await tasks.getProductionTaskManagementAccess();
      if (route === "tasks/edit")
        return response({
          data: await tasks.editProductionTask(await jsonBody(request)),
        });
      if (route === "imports") {
        const fileName = z
          .string()
          .min(1)
          .max(180)
          .regex(/\.(xlsx|csv)$/i)
          .parse(url.searchParams.get("filename"));
        const buffer = await readTaskBody(request, 8 * 1024 * 1024);
        return response(
          {
            data: await tasks.createProductionImportPreview({
              buffer,
              fileName,
              year: new Date().getUTCFullYear(),
            }),
          },
          201,
        );
      }
      if (route === "imports/configure")
        return response({
          data: await tasks.configureProductionImport(await jsonBody(request)),
        });
      if (route === "imports/commit")
        return response(
          {
            data: {
              planIds: await tasks.commitProductionImport(await jsonBody(request)),
            },
          },
          201,
        );
      if (route === "publish") {
        const input = z
          .object({
            planId: productionObjectIdSchema,
            expectedVersion: z.number().int().positive(),
            acknowledgeWarnings: z.boolean(),
            confirmed: z.literal(true),
          })
          .strict()
          .parse(await jsonBody(request));
        await tasks.publishProductionWeekAsManager(input);
        return response({ data: { planId: input.planId } });
      }
    }
    return response({ error: "Ruta no encontrada." }, 404);
  } catch (error) {
    if (
      error instanceof ProductionTaskDomainError ||
      error instanceof ProductionWorkbookParseError
    ) {
      const code = error.code;
      const status =
        code === "forbidden"
          ? 403
          : code === "stale_version" ||
              code === "draft_conflict" ||
              code === "pending_draft"
            ? 409
            : code === "file_too_large"
              ? 413
              : 422;
      return response(
        {
          code,
          error: taskErrorMessage(code),
          ...(error instanceof TaskAvailabilityError
            ? { warnings: error.warnings }
            : {}),
        },
        status,
      );
    }
    if (error instanceof z.ZodError)
      return response(
        {
          code: "invalid_input",
          error:
            path[0] === "tasks"
              ? "Revisá los campos indicados y elegí una fecha válida."
              : "Revisá los datos y las fechas. Cada semana debe comenzar un lunes.",
          fields: error.issues.map((issue) => ({
            path: issue.path.join("."),
            message: issue.message,
          })),
        },
        400,
      );
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    )
      return response(
        {
          code: "forbidden",
          error:
            "Tu sesión no tiene acceso. Revisá tu cuenta y la autenticación en dos pasos.",
        },
        403,
      );
    console.error(
      JSON.stringify({
        scope: "production_tasks",
        operation: "http",
        outcome: "failure",
        code: "unexpected",
        method: request.method,
      }),
    );
    return response(
      {
        code: "unavailable",
        error:
          "No pudimos completar la operación. Revisá el historial antes de reintentar.",
      },
      500,
    );
  }
}
