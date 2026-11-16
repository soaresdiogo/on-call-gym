import { randomUUID } from 'node:crypto';
import { afterEach, describe, expect, it } from 'vitest';
import { signWebhook } from '../src/presentation/webhook-routes.js';
import { startTestStore, TEST_WEBHOOK_SECRET } from './support/test-store.js';

type TestStore = Awaited<ReturnType<typeof startTestStore>>;
let current: TestStore | undefined;

async function store(providerStatus = 201): Promise<TestStore> {
  current = await startTestStore(providerStatus);
  return current;
}

afterEach(async () => {
  await current?.close();
  current = undefined;
});

function checkout(target: TestStore, idempotencyKey?: string) {
  return target.store.app.inject({
    method: 'POST',
    url: '/checkout',
    headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
    payload: { items: [{ productId: 'p-mug', quantity: 2 }] },
  });
}

describe('store HTTP API', () => {
  it('lists the catalog', async () => {
    const target = await store();

    const response = await target.store.app.inject({ method: 'GET', url: '/products' });

    expect(response.statusCode).toBe(200);
    expect(response.json().products).toHaveLength(6);
  });

  it('places a paid order and reads it back', async () => {
    // Arrange
    const target = await store();

    // Act
    const created = await checkout(target);
    const order = await target.store.app.inject({ method: 'GET', url: `/orders/${created.json().orderId}` });

    // Assert
    expect(created.statusCode).toBe(201);
    expect(order.json()).toMatchObject({ status: 'paid', totalCents: 2598 });
  });

  it('answers 404 for an order that does not exist and 400 for a malformed id', async () => {
    const target = await store();

    const missing = await target.store.app.inject({ method: 'GET', url: `/orders/${randomUUID()}` });
    const malformed = await target.store.app.inject({ method: 'GET', url: '/orders/not-a-uuid' });

    expect(missing.statusCode).toBe(404);
    expect(malformed.statusCode).toBe(400);
  });

  it('replays the same order for a repeated idempotency key', async () => {
    // Arrange
    const target = await store();
    const key = randomUUID();

    // Act
    const first = await checkout(target, key);
    const second = await checkout(target, key);

    // Assert
    expect(second.statusCode).toBe(200);
    expect(second.json().orderId).toBe(first.json().orderId);
    expect(target.providerCalls()).toBe(1);
  });

  it('releases the stock when the payment is declined', async () => {
    // Arrange
    const target = await store(402);
    const stockBefore = await stockOf(target, 'p-mug');

    // Act
    const response = await checkout(target);

    // Assert
    expect(response.statusCode).toBe(402);
    expect(await stockOf(target, 'p-mug')).toBe(stockBefore);
  });

  it('rejects webhooks with a bad signature and ignores duplicates', async () => {
    // Arrange
    const target = await store();
    const orderId = (await checkout(target)).json().orderId as string;
    const body = JSON.stringify({ id: `evt_${randomUUID()}`, type: 'payment.succeeded', data: { orderId } });
    const send = (signature: string) =>
      target.store.app.inject({
        method: 'POST',
        url: '/webhooks/payments',
        headers: { 'content-type': 'application/json', 'x-gym-signature': signature },
        payload: body,
      });

    // Act
    const forged = await send('sha256=forged');
    const first = await send(signWebhook(body, TEST_WEBHOOK_SECRET));
    const duplicate = await send(signWebhook(body, TEST_WEBHOOK_SECRET));

    // Assert
    expect(forged.statusCode).toBe(401);
    expect(first.json().outcome).toBe('shipment_created');
    expect(duplicate.json().outcome).toBe('duplicate_ignored');
  });

  it('sends security headers', async () => {
    const target = await store();

    const response = await target.store.app.inject({ method: 'GET', url: '/' });

    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });
});

async function stockOf(target: TestStore, productId: string): Promise<number> {
  const rows = await target.store.database.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [productId]);
  return rows[0]?.stock ?? -1;
}
