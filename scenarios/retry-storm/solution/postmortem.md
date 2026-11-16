# Post-mortem: retry-storm

**Impact.** For the duration of the incident almost every checkout failed while customer demand was flat
at 20 checkouts per second. The payment provider received up to five times its usual call volume.

**Trigger.** The payment provider slowed down (about 300 ms per call when idle, more under load). It
kept processing every request.

**Root cause.** The store's payment client gave each attempt 250 ms, below the provider's slow-but-healthy
latency, and retried up to five times immediately. Every checkout became five calls. A client timeout does
not cancel work on the provider, so abandoned calls kept the provider busy, which made it slower, which caused
more timeouts. The client turned a slowdown into an outage.

**Mitigation.** Timeout above the provider's degraded latency (2 s), at most 3 attempts, exponential backoff
with full jitter between attempts. The provider's idempotency key keeps retries from charging twice.

**Prevention.**
- Alert on amplification (payment calls per checkout), not only on errors or latency.
- Set timeouts from the dependency's measured latency, and review them when the dependency changes.
- Add a retry budget or circuit breaker so retries can never exceed a fraction of normal traffic.
- Load-test checkout with a slow (not failing) payment provider.

**Automation idea.** A detector that alerts when payment calls per checkout stay above 1.5 over a 3-second window. Alerting on
latency fails on the bursty variant, where a healthy store is slow but does not amplify.
See `automation/reference/detector.ts`; try it with `npm run lab -- automate retry-storm`.
