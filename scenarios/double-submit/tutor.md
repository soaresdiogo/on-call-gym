# Tutor notes for double-submit

## Signals worth steering toward

- Two different order ids for two requests that carry the same key.
- The header name the client sends versus the header name the route schema and handler read.
- The `orders.idempotency_key` unique column already exists.

## Common detours

- Disabling the button in the UI: helps humans, not retries from proxies or mobile networks.
- Deduplicating by "same cart within N seconds": two legitimate purchases of the same item get merged.

## Debrief questions

- Where is the guarantee enforced when two duplicates arrive at the same millisecond?
- What should the second response contain?
