import type { HttpResult } from './http-client.js';

const MILLISECONDS_PER_SECOND = 1_000;
const SUCCESS_MIN = 200;
const SUCCESS_MAX = 299;

/** One second of traffic as an operator would see it on a dashboard. */
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

export function toSamples(results: readonly HttpResult[], paymentCallTimes: readonly number[], startedAt: number): TrafficSample[] {
  const last = Math.max(0, ...results.map((result) => secondOf(result.startedAt + result.durationMs, startedAt)));
  return Array.from({ length: last + 1 }, (_, second) => sampleAt(second, results, paymentCallTimes, startedAt));
}

function sampleAt(second: number, results: readonly HttpResult[], paymentCallTimes: readonly number[], startedAt: number): TrafficSample {
  const finished = results.filter((result) => secondOf(result.startedAt + result.durationMs, startedAt) === second);
  const succeeded = finished.filter((result) => result.status >= SUCCESS_MIN && result.status <= SUCCESS_MAX).length;
  return {
    second,
    checkouts: results.filter((result) => secondOf(result.startedAt, startedAt) === second).length,
    succeeded,
    failed: finished.length - succeeded,
    paymentCalls: paymentCallTimes.filter((time) => secondOf(time, startedAt) === second).length,
    p95LatencyMs: p95(finished.map((result) => result.durationMs)),
  };
}

function secondOf(timestamp: number, startedAt: number): number {
  return Math.floor((timestamp - startedAt) / MILLISECONDS_PER_SECOND);
}

function p95(values: readonly number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)] ?? 0;
}
