import "server-only";

import { z } from "zod";
import { getIdentitySession } from "@/features/auth/server/auth-provider";
import { requirePlatformUser } from "@/features/auth/server/require-platform-user";
import { EmployeeCsvError, MAX_IMPORT_BYTES } from "../domain/employee-csv";

const headers = {
  "Cache-Control": "private, no-store",
  Vary: "Cookie",
  "X-Content-Type-Options": "nosniff",
};
export async function employeeBulkHttp(
  request: Request,
  action: () => Promise<Response | unknown>,
) {
  try {
    if (!(await getIdentitySession()))
      return Response.json(
        { error: "Iniciá sesión para continuar." },
        { status: 401, headers },
      );
    await requirePlatformUser({ roles: ["administrator"] });
    if (
      request.method !== "GET" &&
      (request.headers.get("origin") !==
        new URL(process.env.APP_BASE_URL || request.url).origin ||
        request.headers.get("sec-fetch-site") === "cross-site")
    )
      return Response.json(
        { error: "La solicitud debe venir de esta aplicación." },
        { status: 403, headers },
      );
    const result = await action();
    if (result instanceof Response) {
      Object.entries(headers).forEach(([key, value]) => result.headers.set(key, value));
      return result;
    }
    return Response.json({ data: result }, { headers });
  } catch (error) {
    if (error instanceof EmployeeCsvError || error instanceof z.ZodError)
      return Response.json(
        {
          error:
            error instanceof EmployeeCsvError
              ? error.message
              : "El contenido de la solicitud no es válido.",
        },
        { status: 400, headers },
      );
    if (
      typeof error === "object" &&
      error !== null &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    )
      return Response.json(
        {
          error:
            "Se requiere una sesión de administrador con autenticación en dos pasos.",
        },
        { status: 403, headers },
      );
    return Response.json(
      {
        error:
          "No pudimos completar la operación. Revisá el directorio antes de reintentar una importación.",
      },
      { status: 500, headers },
    );
  }
}

export async function readEmployeeImportBody(request: Request) {
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    throw new EmployeeCsvError("Enviá el contenido como JSON.");
  const reader = request.body?.getReader();
  if (!reader) throw new EmployeeCsvError("La solicitud está vacía.");
  const chunks: Uint8Array[] = [];
  let bytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    bytes += value.byteLength;
    if (bytes > MAX_IMPORT_BYTES * 2) {
      await reader.cancel();
      throw new EmployeeCsvError("El archivo es demasiado grande (máximo 128 KB).");
    }
    chunks.push(value);
  }
  let body: unknown;
  try {
    body = JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new EmployeeCsvError("El contenido JSON no es válido.");
  }
  const parsed = z
    .object({ csv: z.string().min(1), mode: z.enum(["validate", "import"]) })
    .strict()
    .parse(body);
  if (Buffer.byteLength(parsed.csv, "utf8") > MAX_IMPORT_BYTES)
    throw new EmployeeCsvError("El archivo supera los 128 KB.");
  return parsed;
}

export function csvDownload(csv: string, filename: string) {
  return new Response(csv, {
    headers: {
      ...headers,
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
