/**
 * Reference automation for retry-storm: alert on amplification, not on latency.
 * A slow provider is not an incident by itself; the store multiplying its own
 * load on that provider is.
 */

export interface TrafficSample {
  readonly second: number;
  readonly checkouts: number;
  readonly succeeded: number;
  readonly failed: number;
  readonly paymentCalls: number;
  readonly p95LatencyMs: number;
}

export interface Detection {
  readonly alert: boolean;
  readonly reason: string;
}

const MAX_CALLS_PER_CHECKOUT = 1.5;
/** A window, not consecutive seconds: in the bursty variant the storm comes and goes every second. */
const WINDOW_SECONDS = 3;
const MIN_CHECKOUTS_IN_WINDOW = 15;

export function detectRetryStorm(samples: readonly TrafficSample[]): Detection {
  for (let start = 0; start + WINDOW_SECONDS <= samples.length; start += 1) {
    const window = samples.slice(start, start + WINDOW_SECONDS);
    const checkouts = window.reduce((total, sample) => total + sample.checkouts, 0);
    const calls = window.reduce((total, sample) => total + sample.paymentCalls, 0);
    if (checkouts >= MIN_CHECKOUTS_IN_WINDOW && calls / checkouts > MAX_CALLS_PER_CHECKOUT) {
      return { alert: true, reason: `${calls} payment calls for ${checkouts} checkouts in ${WINDOW_SECONDS} s from second ${start}` };
    }
  }
  return { alert: false, reason: 'payment calls track checkouts' };
}
