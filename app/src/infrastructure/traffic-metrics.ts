const WINDOW_SECONDS = 60;
const MILLISECONDS_PER_SECOND = 1_000;

interface SecondBucket {
  second: number;
  checkouts: number;
  succeeded: number;
  failed: number;
  paymentAttempts: number;
  latenciesMs: number[];
}

export interface MetricsSnapshot {
  totals: { checkouts: number; succeeded: number; failed: number; paymentAttempts: number };
  latencyMs: { p50: number; p95: number };
  series: { second: number; checkouts: number; succeeded: number; failed: number; paymentAttempts: number; p95LatencyMs: number }[];
}

/** In-memory, per-second counters for the dashboard and the lab's traffic reports. */
export class TrafficMetrics {
  private readonly buckets = new Map<number, SecondBucket>();

  recordCheckout(succeeded: boolean, durationMs: number): void {
    const bucket = this.currentBucket();
    bucket.checkouts += 1;
    bucket.latenciesMs.push(durationMs);
    if (succeeded) {
      bucket.succeeded += 1;
      return;
    }
    bucket.failed += 1;
  }

  recordPaymentAttempt(): void {
    this.currentBucket().paymentAttempts += 1;
  }

  snapshot(): MetricsSnapshot {
    const buckets = [...this.buckets.values()].sort((left, right) => left.second - right.second);
    const latencies = buckets.flatMap((bucket) => bucket.latenciesMs);
    return {
      totals: {
        checkouts: sum(buckets, 'checkouts'),
        succeeded: sum(buckets, 'succeeded'),
        failed: sum(buckets, 'failed'),
        paymentAttempts: sum(buckets, 'paymentAttempts'),
      },
      latencyMs: { p50: percentile(latencies, 50), p95: percentile(latencies, 95) },
      series: buckets.map((bucket) => ({
        second: bucket.second,
        checkouts: bucket.checkouts,
        succeeded: bucket.succeeded,
        failed: bucket.failed,
        paymentAttempts: bucket.paymentAttempts,
        p95LatencyMs: percentile(bucket.latenciesMs, 95),
      })),
    };
  }

  private currentBucket(): SecondBucket {
    const second = Math.floor(Date.now() / MILLISECONDS_PER_SECOND);
    const existing = this.buckets.get(second);
    if (existing) return existing;
    const bucket = { second, checkouts: 0, succeeded: 0, failed: 0, paymentAttempts: 0, latenciesMs: [] };
    this.buckets.set(second, bucket);
    this.buckets.delete(second - WINDOW_SECONDS);
    return bucket;
  }
}

function sum(buckets: readonly SecondBucket[], field: 'checkouts' | 'succeeded' | 'failed' | 'paymentAttempts'): number {
  return buckets.reduce((total, bucket) => total + bucket[field], 0);
}

function percentile(values: readonly number[], rank: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((rank / 100) * sorted.length) - 1);
  return Math.round(sorted[Math.max(0, index)] ?? 0);
}
