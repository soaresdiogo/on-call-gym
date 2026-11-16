import type { FastifyInstance } from 'fastify';
import type { GetOrder } from '../application/get-order.js';
import type { ListProducts } from '../application/list-products.js';
import type { PlaceOrder } from '../application/place-order.js';
import { MAX_QUANTITY_PER_LINE } from '../domain/order.js';
import type { TrafficMetrics } from '../infrastructure/traffic-metrics.js';

const UUID_PATTERN = '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$';
const MAX_IDEMPOTENCY_KEY_LENGTH = 100;
const MAX_CART_LINES = 20;
const HTTP_OK = 200;
const HTTP_CREATED = 201;

export interface StoreRouteDependencies {
  readonly listProducts: ListProducts;
  readonly placeOrder: PlaceOrder;
  readonly getOrder: GetOrder;
  readonly metrics: TrafficMetrics;
}

const checkoutSchema = {
  headers: {
    type: 'object',
    properties: { 'idempotency-key': { type: 'string', minLength: 1, maxLength: MAX_IDEMPOTENCY_KEY_LENGTH } },
  },
  body: {
    type: 'object',
    additionalProperties: false,
    required: ['items'],
    properties: {
      items: {
        type: 'array',
        maxItems: MAX_CART_LINES,
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['productId', 'quantity'],
          properties: {
            productId: { type: 'string', minLength: 1, maxLength: 50 },
            quantity: { type: 'integer', minimum: 1, maximum: MAX_QUANTITY_PER_LINE },
          },
        },
      },
    },
  },
} as const;

interface CheckoutRequest {
  Headers: { 'idempotency-key'?: string };
  Body: { items: { productId: string; quantity: number }[] };
}

export function registerStoreRoutes(app: FastifyInstance, dependencies: StoreRouteDependencies): void {
  app.get('/products', async () => ({ products: await dependencies.listProducts.execute() }));

  app.get<{ Params: { orderId: string } }>(
    '/orders/:orderId',
    { schema: { params: { type: 'object', properties: { orderId: { type: 'string', pattern: UUID_PATTERN } } } } },
    async (request) => dependencies.getOrder.execute(request.params.orderId),
  );

  app.post<CheckoutRequest>('/checkout', { schema: checkoutSchema }, async (request, reply) => {
    const startedAt = performance.now();
    try {
      const result = await dependencies.placeOrder.execute({
        items: request.body.items,
        idempotencyKey: request.headers['idempotency-key'] ?? null,
        correlationId: request.id,
      });
      dependencies.metrics.recordCheckout(true, performance.now() - startedAt);
      request.log.info({ orderId: result.orderId, status: result.status, replayed: result.replayed }, 'checkout finished');
      return reply.status(result.replayed ? HTTP_OK : HTTP_CREATED).send(result);
    } catch (error) {
      dependencies.metrics.recordCheckout(false, performance.now() - startedAt);
      request.log.warn({ reason: error instanceof Error ? error.name : 'unknown' }, 'checkout failed');
      throw error;
    }
  });
}
