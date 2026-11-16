import { randomUUID } from 'node:crypto';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { checkout } from '../../lab/core/http-client.js';
import type { VerifyContext } from '../../lab/core/scenario.js';
import { withHarness, type StoreHarness } from '../../lab/core/store-harness.js';
import { PRODUCT_ID, recordTraffic, SLOW_PROVIDER } from './traffic.js';

const LOAD_DURATION_MS = 3_000;
const MIN_SUCCESS_RATE = 0.95;
const MAX_CALLS_PER_CHECKOUT = 1.5;
const MAX_ATTEMPTS_PER_ORDER = 3;
const MIN_MEDIAN_RETRY_GAP_MS = 20;
const OUTAGE_CHECKOUTS = 5;
const DRAIN_TIMEOUT_MS = 6_000;

export function verifyRetryStorm(context: VerifyContext): Promise<CheckResult[]> {
  return withHarness(context.workspace, { behavior: SLOW_PROVIDER }, async (harness) => [
    ...(await slowProviderChecks(harness)),
    ...(await outageChecks(harness)),
    await transientErrorCheck(harness),
    singleChargeCheck(harness),
  ]);
}

/** Same demand, same slow provider as in the incident. */
async function slowProviderChecks(harness: StoreHarness): Promise<CheckResult[]> {
  const recording = await recordTraffic(harness, LOAD_DURATION_MS);
  await harness.provider.waitUntilIdle(DRAIN_TIMEOUT_MS);
  const successRate = recording.succeeded / recording.checkouts;
  const callsPerCheckout = recording.paymentCalls / recording.checkouts;
  return [
    check('checkouts-recover', 'recovery', `At least ${MIN_SUCCESS_RATE * 100}% of checkouts succeed while the provider is slow`).passWhen(
      successRate >= MIN_SUCCESS_RATE,
      `${recording.succeeded}/${recording.checkouts} checkouts succeeded (${percent(successRate)})`,
    ),
    check('no-call-amplification', 'recovery', `At most ${MAX_CALLS_PER_CHECKOUT} payment calls per checkout under the same load`).passWhen(
      callsPerCheckout <= MAX_CALLS_PER_CHECKOUT,
      `${recording.paymentCalls} payment calls for ${recording.checkouts} checkouts (${callsPerCheckout.toFixed(2)} per checkout)`,
    ),
  ];
}

/** During a hard outage retries must stop at a cap and must not fire back to back. */
async function outageChecks(harness: StoreHarness): Promise<CheckResult[]> {
  harness.provider.configure({ outage: true });
  harness.provider.resetCalls();
  await Promise.all(Array.from({ length: OUTAGE_CHECKOUTS }, () => checkout(harness.storeUrl, [{ productId: PRODUCT_ID, quantity: 1 }], randomUUID())));
  const byKey = Map.groupBy(harness.provider.calls(), (call) => call.idempotencyKey);
  const attempts = [...byKey.values()].map((calls) => calls.length);
  const gaps = [...byKey.values()].flatMap((calls) => calls.slice(1).map((call, index) => call.receivedAt - (calls[index]?.receivedAt ?? 0)));
  const maxAttempts = Math.max(0, ...attempts);
  const medianGap = median(gaps);
  harness.provider.configure({ outage: false });
  return [
    check('retries-capped', 'recovery', `No order makes more than ${MAX_ATTEMPTS_PER_ORDER} payment attempts`).passWhen(
      maxAttempts <= MAX_ATTEMPTS_PER_ORDER && maxAttempts > 0,
      `worst order made ${maxAttempts} attempts during a provider outage`,
    ),
    check('retries-back-off', 'recovery', `Retries wait before trying again (median gap >= ${MIN_MEDIAN_RETRY_GAP_MS} ms)`).passWhen(
      gaps.length === 0 || medianGap >= MIN_MEDIAN_RETRY_GAP_MS,
      gaps.length === 0 ? 'no retries observed' : `median gap between attempts: ${Math.round(medianGap)} ms`,
    ),
  ];
}

/** Regression: removing retries altogether is not a fix; one transient error must still be absorbed. */
async function transientErrorCheck(harness: StoreHarness): Promise<CheckResult> {
  harness.provider.configure({ failFirstCallPerKey: true, baseLatencyMs: 20 });
  const results = await Promise.all(
    Array.from({ length: OUTAGE_CHECKOUTS }, () => checkout(harness.storeUrl, [{ productId: PRODUCT_ID, quantity: 1 }], randomUUID())),
  );
  harness.provider.configure({ failFirstCallPerKey: false });
  const succeeded = results.filter((result) => result.status === 201).length;
  return check('transient-error-retried', 'regression', 'A single transient provider error is still retried and the checkout succeeds').passWhen(
    succeeded === results.length,
    `${succeeded}/${results.length} checkouts succeeded when the first payment call failed once`,
  );
}

function singleChargeCheck(harness: StoreHarness): CheckResult {
  const doubleCharged = [...harness.provider.chargesPerOrder().values()].filter((count) => count > 1).length;
  return check('single-charge', 'regression', 'No order is charged more than once').passWhen(
    doubleCharged === 0,
    doubleCharged === 0 ? 'every paid order has exactly one charge' : `${doubleCharged} orders were charged more than once`,
  );
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
