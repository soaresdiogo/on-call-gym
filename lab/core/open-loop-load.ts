import { randomUUID } from 'node:crypto';
import { setTimeout as sleep } from 'node:timers/promises';
import { checkout, type HttpResult } from './http-client.js';

const MILLISECONDS_PER_SECOND = 1_000;

export interface LoadProfile {
  readonly storeUrl: string;
  readonly checkoutsPerSecond: number;
  readonly durationMs: number;
  readonly productId: string;
}

/**
 * Open-loop traffic: customers keep arriving at the same rate whether or not the
 * store is slow. Closed-loop load would politely back off and hide a retry storm.
 */
export async function runOpenLoopCheckouts(profile: LoadProfile): Promise<HttpResult[]> {
  const intervalMs = MILLISECONDS_PER_SECOND / profile.checkoutsPerSecond;
  const total = Math.round((profile.durationMs / MILLISECONDS_PER_SECOND) * profile.checkoutsPerSecond);
  const startedAt = Date.now();
  const pending: Promise<HttpResult>[] = [];
  for (let index = 0; index < total; index += 1) {
    await sleep(Math.max(0, startedAt + index * intervalMs - Date.now()));
    pending.push(checkout(profile.storeUrl, [{ productId: profile.productId, quantity: 1 }], randomUUID()));
  }
  return Promise.all(pending);
}

export function isSuccess(result: HttpResult): boolean {
  return result.status >= 200 && result.status < 300;
}
