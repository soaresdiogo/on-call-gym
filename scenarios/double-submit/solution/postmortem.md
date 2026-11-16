# Post-mortem: double-submit

**Impact.** Customers who clicked twice got two orders and two charges. Support refunded them by hand.

**Root cause.** The shop sends `Idempotency-Key`; the checkout route was changed to read `X-Idempotency-Key`.
Every request reached the use case with no key, so nothing identified the repeat. Both layers were
"correct" on their own, and no test covered them together.

**Mitigation.** Read the header the client actually sends (`idempotency-key`). The use case returns the stored
order for a known key, and the unique constraint on `orders.idempotency_key` handles simultaneous duplicates.

**Prevention.**
- One shared constant (or an OpenAPI contract) for header names used by client and server.
- An end-to-end test that sends the same request twice and counts orders.
- Reject checkout requests without an idempotency key once every client sends one.

**Automation idea.** A replay test generated from recorded traffic: send every recorded `POST` twice and assert
the number of created resources does not change.
