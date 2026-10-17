export class ApiClientError extends Error {
  constructor(
    public code: string,
    public status: number,
    message?: string,
  ) {
    super(message ?? code);
    this.name = "ApiClientError";
  }
}

/** Fetch a `/api/v1/...` endpoint and unwrap the `{data}` / `{error}` envelope. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    headers: init?.body ? { "content-type": "application/json" } : undefined,
    ...init,
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) {
    const err = json?.error;
    throw new ApiClientError(err?.code ?? "unknown_error", res.status, err?.message);
  }
  return json.data as T;
}
