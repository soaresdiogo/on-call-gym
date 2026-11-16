import type { ChargeReceipt, ChargeRequest, PaymentGateway } from '../application/ports.js';
import { PaymentDeclinedError, PaymentUnavailableError } from '../domain/errors.js';
import type { Logger } from './logger.js';
import type { TrafficMetrics } from './traffic-metrics.js';

// Checkout must feel instant: give up quickly and try again.
const ATTEMPT_TIMEOUT_MS = 250;
const MAX_ATTEMPTS = 5;
const HTTP_CREATED = 201;
const HTTP_PAYMENT_REQUIRED = 402;

type AttemptResult =
  | { kind: 'succeeded'; receipt: ChargeReceipt }
  | { kind: 'declined' }
  | { kind: 'retryable'; reason: string };

/** Calls the payment provider, retrying until it answers. */
export class HttpPaymentGateway implements PaymentGateway {
  constructor(
    private readonly providerUrl: string,
    private readonly observability: { logger: Logger; metrics: TrafficMetrics },
  ) {}

  async charge(request: ChargeRequest): Promise<ChargeReceipt> {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      const result = await this.attempt(request, attempt);
      if (result.kind === 'succeeded') return result.receipt;
      if (result.kind === 'declined') throw new PaymentDeclinedError(`Payment declined for order ${request.orderId}`);
    }
    throw new PaymentUnavailableError(`Payment provider unavailable for order ${request.orderId}`);
  }

  private async attempt(request: ChargeRequest, attempt: number): Promise<AttemptResult> {
    this.observability.metrics.recordPaymentAttempt();
    const result = await this.send(request);
    this.log(request, attempt, result);
    return result;
  }

  private async send(request: ChargeRequest): Promise<AttemptResult> {
    try {
      const response = await fetch(new URL('/charges', this.providerUrl), {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': `order-${request.orderId}`,
          'x-correlation-id': request.correlationId,
        },
        body: JSON.stringify({ orderId: request.orderId, amountCents: request.amount.toCents() }),
        signal: AbortSignal.timeout(ATTEMPT_TIMEOUT_MS),
      });
      return await toAttemptResult(response);
    } catch (error) {
      return { kind: 'retryable', reason: error instanceof Error ? error.name : 'unknown_error' };
    }
  }

  private log(request: ChargeRequest, attempt: number, result: AttemptResult): void {
    const details = { orderId: request.orderId, correlationId: request.correlationId, attempt, result: result.kind };
    if (result.kind === 'retryable') {
      this.observability.logger.warn({ ...details, reason: result.reason }, 'payment attempt failed');
      return;
    }
    this.observability.logger.info(details, 'payment attempt finished');
  }
}

async function toAttemptResult(response: Response): Promise<AttemptResult> {
  if (response.status === HTTP_CREATED) {
    const body = (await response.json()) as { paymentId: string };
    return { kind: 'succeeded', receipt: { paymentId: body.paymentId } };
  }
  if (response.status === HTTP_PAYMENT_REQUIRED) {
    return { kind: 'declined' };
  }
  return { kind: 'retryable', reason: `http_${response.status}` };
}
