export class TaskApiError extends Error {
  constructor(
    message: string,
    public readonly code?: string,
    public readonly warnings?: string[],
  ) {
    super(message);
  }
}

export async function taskRequest<T>(path: string, body: unknown): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/production-tasks/v1/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new TaskApiError(
      "No pudimos confirmar si se guardó el cambio. Revisá el plan o el historial antes de reintentar.",
      "outcome_unknown",
    );
  }
  const result = await response.json().catch(() => null);
  if (!result || (response.ok && !result.data))
    throw new TaskApiError(
      "No pudimos confirmar el resultado. Revisá el plan o el historial antes de reintentar.",
      "outcome_unknown",
    );
  if (!response.ok)
    throw new TaskApiError(
      result.error ?? "No pudimos completar la operación.",
      result.code,
      result.warnings,
    );
  return result.data as T;
}
