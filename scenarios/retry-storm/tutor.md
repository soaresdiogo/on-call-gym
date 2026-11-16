# Tutor notes for retry-storm

These notes are for the `incident-tutor` skill. They describe signals and common detours, not the fix.

## Signals worth steering toward

- The ratio between payment calls and checkouts (the dashboard shows "payment calls per checkout").
- Per-order log lines: several `payment attempt failed` lines for the same `orderId`, close together.
- The provider is slow but answers: its latency is higher than normal, but its calls still complete.

## Common detours

- "The provider is down, nothing we can do": the status page says it is processing, and the numbers
  show the store multiplying its own load.
- Removing retries completely: the regression check requires one transient error to still be absorbed.
- Raising the timeout only: it helps under this load, but an outage still produces back-to-back retries.

## Debrief questions

- Which number told you the store was amplifying the problem?
- Why does a client timeout not stop the work on the provider side?
- How did you confirm recovery, and what would you alert on next time?
