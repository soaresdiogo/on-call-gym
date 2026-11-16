import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import Fastify, { type FastifyInstance } from 'fastify';
import { ConcurrencyBarrier } from './concurrency-barrier.js';

export const LOOPBACK = '127.0.0.1';
const MAX_LATENCY_MS = 5_000;
const MAX_RECORDED_CALLS = 50_000;

export interface ProviderBehavior {
  /** Latency of one call when the provider is idle. */
  readonly baseLatencyMs: number;
  /** Concurrent calls the provider absorbs before every call gets slower. */
  readonly capacity: number;
  /** Every call fails fast with 503. */
  readonly outage: boolean;
  /** The first call for each idempotency key fails with 503; the next one works. */
  readonly failFirstCallPerKey: boolean;
  /** Holds calls until this many are in flight (or the timeout passes). */
  readonly holdUntilConcurrent: { parties: number; timeoutMs: number } | null;
  /** Alternating slow periods, used by scenario variants. */
  readonly burst: { periodMs: number; slowLatencyMs: number } | null;
}

export const DEFAULT_BEHAVIOR: ProviderBehavior = {
  baseLatencyMs: 40,
  capacity: 20,
  outage: false,
  failFirstCallPerKey: false,
  holdUntilConcurrent: null,
  burst: null,
};

export type CallOutcome = 'charged' | 'replayed' | 'unavailable';

export interface ProviderCall {
  readonly idempotencyKey: string;
  readonly orderId: string;
  readonly receivedAt: number;
  outcome: CallOutcome | 'in_flight';
}

interface ChargeBody {
  orderId: string;
  amountCents: number;
}

/**
 * Fictional payment provider. It keeps working on calls the client already gave up on,
 * like a real overloaded dependency, which is what makes retry storms visible.
 */
export class PaymentProviderSimulator {
  private behavior: ProviderBehavior = DEFAULT_BEHAVIOR;
  private barrier: ConcurrencyBarrier | null = null;
  private readonly ledger = new ProviderLedger();

  private constructor(private readonly server: FastifyInstance) {}

  static async start(port = 0, behavior: Partial<ProviderBehavior> = {}): Promise<PaymentProviderSimulator> {
    // Abandoned calls must not keep the simulator open after a test phase.
    const simulator = new PaymentProviderSimulator(Fastify({ logger: false, forceCloseConnections: true }));
    simulator.configure(behavior);
    simulator.registerRoutes();
    await simulator.server.listen({ host: LOOPBACK, port });
    return simulator;
  }

  get url(): string {
    const address = this.server.server.address();
    if (!address || typeof address === 'string') throw new Error('Payment provider is not listening');
    return `http://${LOOPBACK}:${address.port}`;
  }

  configure(behavior: Partial<ProviderBehavior>): void {
    this.behavior = { ...this.behavior, ...behavior };
    const hold = this.behavior.holdUntilConcurrent;
    this.barrier = hold ? new ConcurrencyBarrier(hold.parties, hold.timeoutMs) : null;
  }

  calls(): readonly ProviderCall[] {
    return this.ledger.calls;
  }

  /** Successful charges per order id; more than one means a customer paid twice. */
  chargesPerOrder(): Map<string, number> {
    return this.ledger.chargesPerOrder();
  }

  /** Waits for calls that clients abandoned, so one test phase does not slow the next. */
  async waitUntilIdle(timeoutMs: number): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    while (this.ledger.inFlight > 0 && Date.now() < deadline) await sleep(50);
  }

  resetCalls(): void {
    this.ledger.clearCalls();
  }

  close(): Promise<void> {
    return this.server.close();
  }

  private registerRoutes(): void {
    this.server.post<{ Body: ChargeBody }>('/charges', async (request, reply) => {
      const key = String(request.headers['idempotency-key'] ?? '');
      const call = this.ledger.record(key, request.body.orderId);
      const result = await this.process(call);
      return reply.status(result.status).send(result.body);
    });
    this.server.post<{ Body: Partial<ProviderBehavior> }>('/__lab/behavior', async (request) => {
      this.configure(request.body);
      return this.behavior;
    });
    this.server.get('/__lab/calls', async () => ({ calls: this.ledger.calls.map((call) => call.receivedAt) }));
    this.server.post('/__lab/reset-calls', async () => {
      this.ledger.clearCalls();
      return { reset: true };
    });
    this.server.post('/__lab/reset', async () => {
      this.ledger.clearCalls();
      this.configure(DEFAULT_BEHAVIOR);
      return { reset: true };
    });
  }

  private async process(call: ProviderCall): Promise<{ status: number; body: object }> {
    if (this.shouldFailFast(call)) {
      call.outcome = 'unavailable';
      return { status: 503, body: { error: 'temporarily_unavailable' } };
    }
    await this.barrier?.arrive();
    await this.ledger.trackInFlight(() => sleep(this.currentLatency()));
    return { status: 201, body: { paymentId: this.ledger.settle(call) } };
  }

  private shouldFailFast(call: ProviderCall): boolean {
    if (this.behavior.outage) return true;
    return this.behavior.failFirstCallPerKey && this.ledger.callsFor(call.idempotencyKey) === 1;
  }

  /** Latency grows with the work in flight, including work for clients that already timed out. */
  private currentLatency(): number {
    const load = 1 + this.ledger.inFlight / this.behavior.capacity;
    return Math.min(MAX_LATENCY_MS, this.baseLatencyNow() * load);
  }

  private baseLatencyNow(): number {
    const burst = this.behavior.burst;
    if (!burst) return this.behavior.baseLatencyMs;
    const inSlowHalf = Math.floor(Date.now() / burst.periodMs) % 2 === 1;
    return inSlowHalf ? burst.slowLatencyMs : this.behavior.baseLatencyMs;
  }
}

/** Calls received and charges made, kept apart from the simulator's behaviour. */
class ProviderLedger {
  readonly calls: ProviderCall[] = [];
  inFlight = 0;
  private readonly payments = new Map<string, { paymentId: string; orderId: string }>();

  record(idempotencyKey: string, orderId: string): ProviderCall {
    const call: ProviderCall = { idempotencyKey, orderId, receivedAt: Date.now(), outcome: 'in_flight' };
    if (this.calls.length < MAX_RECORDED_CALLS) this.calls.push(call);
    return call;
  }

  callsFor(idempotencyKey: string): number {
    return this.calls.filter((call) => call.idempotencyKey === idempotencyKey).length;
  }

  async trackInFlight(work: () => Promise<unknown>): Promise<void> {
    this.inFlight += 1;
    try {
      await work();
    } finally {
      this.inFlight -= 1;
    }
  }

  /** Idempotent: the same key always maps to the same payment. */
  settle(call: ProviderCall): string {
    const existing = this.payments.get(call.idempotencyKey);
    if (existing) {
      call.outcome = 'replayed';
      return existing.paymentId;
    }
    const paymentId = `pay_${randomUUID()}`;
    this.payments.set(call.idempotencyKey, { paymentId, orderId: call.orderId });
    call.outcome = 'charged';
    return paymentId;
  }

  chargesPerOrder(): Map<string, number> {
    const counts = new Map<string, number>();
    for (const payment of this.payments.values()) {
      counts.set(payment.orderId, (counts.get(payment.orderId) ?? 0) + 1);
    }
    return counts;
  }

  clearCalls(): void {
    this.calls.length = 0;
  }
}
