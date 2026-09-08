import "server-only";

import { auth } from "@clerk/nextjs/server";
import { z } from "zod";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { PlanningError } from "../domain/contracts";
import type { PlanningActor } from "../application/ports";

const responseHeaders = {
  "Cache-Control": "private, no-store, max-age=0",
  Vary: "Cookie, Authorization",
};

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = new URL(process.env.APP_BASE_URL || request.url).origin;
  if (
    !origin ||
    origin !== expected ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    throw new PlanningError(
      "forbidden_origin",
      "La solicitud debe venir de la aplicación autorizada.",
      403,
    );
}

export async function readJson(request: Request) {
  if (
    !request.headers.get("content-type")?.toLowerCase().startsWith("application/json")
  )
    throw new PlanningError("content_type", "Se requiere contenido JSON.", 415);
  // Bound actual bytes, including chunked requests, before parsing or calling the model.
  const reader = request.body?.getReader();
  if (!reader) throw new PlanningError("invalid_json", "La solicitud está vacía.");
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > 256000) {
      await reader.cancel();
      throw new PlanningError(
        "body_too_large",
        "La solicitud es demasiado grande.",
        413,
      );
    }
    chunks.push(value);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
  } catch {
    throw new PlanningError("invalid_json", "El contenido JSON no es válido.");
  }
}

export async function planningHttp(
  request: Request,
  action: (actor: PlanningActor) => Promise<unknown>,
) {
  try {
    const session = await auth();
    if (!session.userId)
      throw new PlanningError("unauthorized", "Iniciá sesión para continuar.", 401);
    const user = await requirePlatformUser({ roles: ["administrator"] });
    if (request.method !== "GET") assertSameOrigin(request);
    const data = await action({
      id: user.platformUser.id,
      role: user.platformUser.role,
    });
    if (data instanceof Response) {
      for (const [key, value] of Object.entries(responseHeaders))
        data.headers.set(key, value);
      return data;
    }
    return Response.json({ data }, { headers: responseHeaders });
  } catch (error) {
    if (error instanceof PlanningError)
      return Response.json(
        { error: { code: error.code, message: error.message } },
        { status: error.status, headers: responseHeaders },
      );
    if (error instanceof z.ZodError)
      return Response.json(
        {
          error: {
            code: "validation",
            message: "Revisá los campos y los límites del formulario.",
            fields: error.issues.map((issue) => issue.path.join(".")),
          },
        },
        { status: 400, headers: responseHeaders },
      );
    // Page authentication redirects become JSON errors at this transport boundary.
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    )
      return Response.json(
        {
          error: {
            code: "forbidden",
            message:
              "Tu sesión no tiene acceso. Revisá tu cuenta y la autenticación de dos pasos.",
          },
        },
        { status: 403, headers: responseHeaders },
      );
    return Response.json(
      {
        error: {
          code: "internal",
          message: "No pudimos guardar o cargar la información. Intentá de nuevo.",
        },
      },
      { status: 500, headers: responseHeaders },
    );
  }
}
