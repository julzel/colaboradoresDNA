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
  const response = await fetch(`/api/production-tasks/v1/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok)
    throw new TaskApiError(
      result.error ?? "No pudimos completar la operación.",
      result.code,
      result.warnings,
    );
  return result.data as T;
}
