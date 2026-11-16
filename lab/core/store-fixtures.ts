import { randomUUID } from 'node:crypto';
import { createHmac } from 'node:crypto';
import { checkout, requestJson, type HttpResult } from './http-client.js';
import type { SqlClient } from './store-harness.js';

/** Helpers verifiers use to arrange state and inspect it, through the API and the database. */

export async function countRows(database: SqlClient, sql: string, params: unknown[] = []): Promise<number> {
  const rows = await database.query<{ count: number }>(sql, params);
  return Number(rows[0]?.count ?? 0);
}

export async function placePaidOrder(storeUrl: string): Promise<string> {
  const result = await checkout(storeUrl, [{ productId: 'p-filters', quantity: 1 }], randomUUID());
  const orderId = result.body.orderId;
  if (result.status !== 201 || typeof orderId !== 'string') {
    throw new Error(`Could not place an order to arrange the test (status ${result.status})`);
  }
  return orderId;
}

export function sendPaymentWebhook(storeUrl: string, secret: string, event: { id: string; orderId: string }): Promise<HttpResult> {
  const body = JSON.stringify({ id: event.id, type: 'payment.succeeded', data: { orderId: event.orderId } });
  const signature = `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
  return requestJson(`${storeUrl}/webhooks/payments`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-gym-signature': signature },
    body,
  });
}

export function isSuccessStatus(status: number): boolean {
  return status >= 200 && status < 300;
}
