/**
 * Your automation for retry-storm.
 *
 * Write a detector that looks at one recording of store traffic (one sample per second)
 * and decides whether a retry storm is happening. `npm run lab -- automate retry-storm`
 * runs it on four recordings: the original incident and a variant with a different
 * slowness pattern, each with the faulty and the fixed store. It must alert on both
 * storms and stay quiet when the store is healthy, even if the provider is slow.
 *
 * Use any tool you like, AI included. Keep the exported names and types.
 */

export interface TrafficSample {
  /** Seconds since the recording started. */
  readonly second: number;
  /** Customer checkouts that arrived in this second. */
  readonly checkouts: number;
  /** Checkouts that finished in this second, by outcome. */
  readonly succeeded: number;
  readonly failed: number;
  /** Calls the payment provider received in this second, retries included. */
  readonly paymentCalls: number;
  /** p95 duration of the checkouts that finished in this second. */
  readonly p95LatencyMs: number;
}

export interface Detection {
  readonly alert: boolean;
  readonly reason: string;
}

export function detectRetryStorm(samples: readonly TrafficSample[]): Detection {
  return { alert: false, reason: `not implemented yet (${samples.length} samples ignored)` };
}
