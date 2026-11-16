import { setTimeout as sleep } from 'node:timers/promises';
import { heading, print, style, table } from '../../lab/core/console-output.js';
import { requestJson } from '../../lab/core/http-client.js';
import { runOpenLoopCheckouts } from '../../lab/core/open-loop-load.js';
import type { StackContext } from '../../lab/core/scenario.js';
import { toSamples } from '../../lab/core/traffic-monitor.js';
import type { ProviderBehavior } from '../../lab/simulators/payment-provider.js';
import { CHECKOUTS_PER_SECOND, HEALTHY_PROVIDER, PRODUCT_ID, SLOW_PROVIDER } from './traffic.js';

const PHASES: readonly { name: string; behavior: Partial<ProviderBehavior>; durationMs: number }[] = [
  { name: 'Normal traffic', behavior: HEALTHY_PROVIDER, durationMs: 4_000 },
  { name: 'Payment provider gets slow', behavior: SLOW_PROVIDER, durationMs: 8_000 },
];

/** Replays the incident against the running store and prints what the on-call engineer would see. */
export async function reproduceRetryStorm(context: StackContext): Promise<void> {
  print(style.dim(`Sending ${CHECKOUTS_PER_SECOND} checkouts per second to ${context.storeUrl}. Demand never changes.`));
  for (const phase of PHASES) {
    await runPhase(context, phase);
  }
  await setBehavior(context.providerUrl, HEALTHY_PROVIDER);
  print();
  print(style.dim('Provider back to normal. Watch the same numbers live at ' + `${context.storeUrl}/dashboard`));
}

async function runPhase(context: StackContext, phase: (typeof PHASES)[number]): Promise<void> {
  await setBehavior(context.providerUrl, phase.behavior);
  await requestJson(`${context.providerUrl}/__lab/reset-calls`, { method: 'POST' });
  heading(phase.name);
  const startedAt = Date.now();
  const results = await runOpenLoopCheckouts({
    storeUrl: context.storeUrl,
    checkoutsPerSecond: CHECKOUTS_PER_SECOND,
    durationMs: phase.durationMs,
    productId: PRODUCT_ID,
  });
  await sleep(200);
  const calls = await requestJson(`${context.providerUrl}/__lab/calls`);
  const samples = toSamples(results, (calls.body.calls as number[] | undefined) ?? [], startedAt);
  table([
    ['second', 'checkouts in', 'ok', 'failed', 'payment calls', 'p95 ms'],
    ...samples.map((sample) => [
      String(sample.second + 1),
      String(sample.checkouts),
      String(sample.succeeded),
      String(sample.failed),
      String(sample.paymentCalls),
      String(sample.p95LatencyMs),
    ]),
  ]);
  const succeeded = results.filter((result) => result.status >= 200 && result.status < 300).length;
  const paymentCalls = samples.reduce((total, sample) => total + sample.paymentCalls, 0);
  print(
    style.bold(
      `success ${Math.round((succeeded / results.length) * 100)}%  |  payment calls per checkout ${(paymentCalls / results.length).toFixed(2)}`,
    ),
  );
}

async function setBehavior(providerUrl: string, behavior: Partial<ProviderBehavior>): Promise<void> {
  await requestJson(`${providerUrl}/__lab/behavior`, { method: 'POST', body: behavior });
}
