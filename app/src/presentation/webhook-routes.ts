import { createHmac, timingSafeEqual } from 'node:crypto';
import type { FastifyInstance } from 'fastify';
import type { HandlePaymentWebhook } from '../application/handle-payment-webhook.js';
import { UnauthorizedError, ValidationError } from '../domain/errors.js';

export const SIGNATURE_HEADER = 'x-gym-signature';
const SIGNATURE_PREFIX = 'sha256=';

interface PaymentEvent {
  id: string;
  type: 'payment.succeeded';
  data: { orderId: string };
}

const eventSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['id', 'type', 'data'],
  properties: {
    id: { type: 'string', minLength: 1, maxLength: 100 },
    type: { type: 'string', enum: ['payment.succeeded'] },
    data: {
      type: 'object',
      additionalProperties: false,
      required: ['orderId'],
      properties: { orderId: { type: 'string', minLength: 1, maxLength: 100 } },
    },
  },
} as const;

/** The provider signs the raw body; the route checks the HMAC before trusting anything in it. */
export function registerWebhookRoutes(app: FastifyInstance, handler: HandlePaymentWebhook, secret: string): void {
  app.register(async (scope) => {
    scope.addContentTypeParser('application/json', { parseAs: 'string' }, (request, body, done) => {
      try {
        verifySignature(String(body), request.headers[SIGNATURE_HEADER], secret);
        done(null, parseJson(String(body)));
      } catch (error) {
        done(error as Error, undefined);
      }
    });

    scope.post<{ Body: PaymentEvent }>('/webhooks/payments', { schema: { body: eventSchema } }, async (request) => {
      const outcome = await handler.execute({ eventId: request.body.id, orderId: request.body.data.orderId });
      request.log.info({ eventId: request.body.id, orderId: request.body.data.orderId, outcome }, 'webhook handled');
      return { received: true, outcome };
    });
  });
}

export function signWebhook(rawBody: string, secret: string): string {
  return SIGNATURE_PREFIX + createHmac('sha256', secret).update(rawBody).digest('hex');
}

function verifySignature(rawBody: string, header: string | string[] | undefined, secret: string): void {
  const received = Buffer.from(typeof header === 'string' ? header : '');
  const expected = Buffer.from(signWebhook(rawBody, secret));
  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    throw new UnauthorizedError('Invalid webhook signature');
  }
}

function parseJson(rawBody: string): unknown {
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new ValidationError('The webhook body is not valid JSON');
  }
}
