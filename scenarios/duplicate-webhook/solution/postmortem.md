# Post-mortem: duplicate-webhook

**Impact.** Orders whose payment event was redelivered were shipped twice. The provider redelivers whenever
our acknowledgement is slow, so it happened most at peak hours.

**Root cause.** A refactor of the webhook handler dropped the call to the inbox (`webhook_events`), the only
thing that remembered which event ids were processed. The handler trusted every delivery to be the first.

**Mitigation.** Claim the event id with `INSERT ... ON CONFLICT DO NOTHING` before creating the shipment; a
duplicate is acknowledged with 2xx and ignored. If shipping fails, the claim is released so a redelivery can
retry it.

**Prevention.**
- Treat every webhook as at-least-once; review handlers for idempotency.
- Test each handler with a duplicate and with two simultaneous deliveries.
- Alert when one order has more than one shipment.

**Automation idea.** A nightly query that flags orders with more than one shipment, and a test helper that
replays every webhook fixture twice.
