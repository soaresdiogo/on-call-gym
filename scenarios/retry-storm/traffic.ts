import { runOpenLoopCheckouts } from '../../lab/core/open-loop-load.js';
import type { StoreHarness } from '../../lab/core/store-harness.js';
import { toSamples, type TrafficSample } from '../../lab/core/traffic-monitor.js';
import type { ProviderBehavior } from '../../lab/simulators/payment-provider.js';

/** Demand stays flat at 20 checkouts per second through the whole incident. */
export const CHECKOUTS_PER_SECOND = 20;
export const PRODUCT_ID = 'p-espresso';

export const HEALTHY_PROVIDER: Partial<ProviderBehavior> = { baseLatencyMs: 40, capacity: 20, burst: null, outage: false };
/** The incident: the provider is slow (300 ms when idle) but it still answers. */
export const SLOW_PROVIDER: Partial<ProviderBehavior> = { baseLatencyMs: 300, capacity: 20, burst: null, outage: false };
/** The variant for the automation exercise: one second fast, one second slow (500 ms). */
export const BURSTY_PROVIDER: Partial<ProviderBehavior> = {
  baseLatencyMs: 40,
  capacity: 20,
  burst: { periodMs: 1_000, slowLatencyMs: 500 },
  outage: false,
};

export interface Recording {
  readonly samples: TrafficSample[];
  readonly checkouts: number;
  readonly succeeded: number;
  readonly paymentCalls: number;
}

/** Sends open-loop traffic to a running harness and returns per-second samples. */
export async function recordTraffic(harness: StoreHarness, durationMs: number): Promise<Recording> {
  harness.provider.resetCalls();
  const startedAt = Date.now();
  const results = await runOpenLoopCheckouts({
    storeUrl: harness.storeUrl,
    checkoutsPerSecond: CHECKOUTS_PER_SECOND,
    durationMs,
    productId: PRODUCT_ID,
  });
  const callTimes = harness.provider.calls().map((call) => call.receivedAt);
  return {
    samples: toSamples(results, callTimes, startedAt),
    checkouts: results.length,
    succeeded: results.filter((result) => result.status >= 200 && result.status < 300).length,
    paymentCalls: callTimes.length,
  };
}
