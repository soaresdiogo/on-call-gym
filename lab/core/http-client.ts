const REQUEST_TIMEOUT_MS = 15_000;

export interface HttpResult {
  readonly status: number;
  readonly body: Record<string, unknown>;
  readonly durationMs: number;
  readonly startedAt: number;
}

/** Network failures become status 0 so traffic reports count them instead of crashing. */
export async function requestJson(
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: unknown } = {},
): Promise<HttpResult> {
  const startedAt = Date.now();
  try {
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: { ...(init.body === undefined ? {} : { 'content-type': 'application/json' }), ...init.headers },
      ...(init.body === undefined ? {} : { body: typeof init.body === 'string' ? init.body : JSON.stringify(init.body) }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const text = await response.text();
    return { status: response.status, body: parseBody(text), durationMs: Date.now() - startedAt, startedAt };
  } catch {
    return { status: 0, body: {}, durationMs: Date.now() - startedAt, startedAt };
  }
}

function parseBody(text: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(text);
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

export function checkout(
  storeUrl: string,
  items: { productId: string; quantity: number }[],
  idempotencyKey?: string,
): Promise<HttpResult> {
  return requestJson(`${storeUrl}/checkout`, {
    method: 'POST',
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    body: { items },
  });
}
