# Roadmap

Six scenarios ship today. These 19 are specified and waiting for contributors. Each line gives the symptom the
learner sees, the recovery criterion the verifier must prove, and a suggested way to reproduce it
deterministically. Pick one, open (or comment on) its issue, and follow [CONTRIBUTING.md](../CONTRIBUTING.md).

The "cause" column is a spoiler for maintainers. Do not copy it into the brief.

## Incidents · junior

| ID | Symptom (brief) | Recovery criterion | Reproduction idea | Cause (spoiler) |
|---|---|---|---|---|
| `missing-config` | The store boots fine, the first purchase fails | Invalid configuration is detected before the store accepts traffic; the store works with the correct configuration | Start the store with one required variable missing; verify boot fails fast and readiness stays down | Config read lazily inside the checkout path |
| `export-last-page` | The orders export misses some orders | Every order appears exactly once, also when the last page is incomplete | Seed 2.5 pages of orders | Off-by-one / `<` vs `<=` on the last page |
| `coupon-timezone` | A coupon expires at the wrong hour | With a fixed clock and timezone, the coupon is accepted before the limit and refused from the limit | Controlled clock port; `TZ` fixed | Expiry compared in server local time |
| `rounding-cent` | The final total is one cent off | Totals and discounts follow the documented rounding rule, including boundary cases | Prices that round at .5 | Float arithmetic, rounding per line vs per order |
| `zero-stock` | A product with no stock shows as available | Out-of-stock products show as unavailable and cannot be bought; in-stock ones stay available | Seed one product with stock 0 | `stock >= 0` instead of `stock > 0` |
| `accented-search` | Searching "cafe" misses "Café Mug" | Accent-insensitive equivalence as documented; relevant results kept | Seed accented names | Comparison without Unicode normalisation |
| `checkout-timeout` | Checkout spins forever when a dependency is slow | Checkout ends within the defined deadline with an observable error state, and recovers when the dependency is back | Provider latency far above the deadline | No timeout on the dependency call |
| `cancelled-sales` | The sales report includes cancelled orders | Sums and counts exclude cancellations and include eligible orders | Seed paid and cancelled orders | Missing status filter |

## Incidents · mid

| ID | Symptom (brief) | Recovery criterion | Reproduction idea | Cause (spoiler) |
|---|---|---|---|---|
| `stale-price-cache` | The old price is still shown after an update | A read after the update sees the new price within the defined consistency window | In-memory cache in front of the product repository | Cache never invalidated on write |
| `missing-index` | The catalogue slows down under load | Same results on fixed data, and the plan shows the expected index access; latency as a secondary signal | Seed enough rows; `EXPLAIN` in PGlite | Filter column without an index |
| `poison-job` | One bad order blocks the queue for everyone | The invalid job ends in an inspectable state after limited attempts; healthy jobs move on | PostgreSQL-backed queue table and worker | Unbounded retries, no dead-letter state |
| `early-readiness` | A deploy gets traffic before the store is ready | With a slow start, the store stays out of rotation until ready, then serves normally | Delay a startup dependency; probe `/health/ready` | Readiness returns 200 before warm-up |

## Incidents · senior

| ID | Symptom (brief) | Recovery criterion | Reproduction idea | Cause (spoiler) |
|---|---|---|---|---|
| `blocking-migration` | Writes stall during a deploy with two API versions | Writes continue during the migration, and old and new versions both work during the transition | Needs two connections: Docker Compose PostgreSQL | Locking `ALTER TABLE`, non-expand/contract change |
| `lost-payment-response` | The payment was accepted but the store never got the answer | Reconciliation fixes the order state and keeps a single charge, also after a retry | Provider charges, then drops the response | No reconciliation with the provider's idempotency key |
| `partial-queue-replay` | A batch fails after sending some messages | Replay completes the pending sends, keeps the sent ones, and is repeatable | Fail the batch at item N | Batch-level retry without per-item state |

## GitHub Actions

| ID | Symptom (brief) | Recovery criterion | Needs a real GitHub run for | Cause (spoiler) |
|---|---|---|---|---|
| `silent-pr` | A PR that changes the app gets no CI at all | A PR between branches of the same fork that changes the app triggers the workflow and runs the checks | The trigger itself | `paths` filter or branch filter that misses the change |
| `runner-install` | `npm ci` passes locally and fails on a clean runner | The job installs from the lockfile and runs the checks from a clean checkout | Clean runner behaviour | Lockfile out of sync / wrong Node version |
| `database-readiness` | Integration tests connect before PostgreSQL is ready | With a controlled delayed start, the job waits for a real readiness signal and runs the tests | Service containers | No health check, `sleep` instead of readiness |
| `wrong-artifact` | Deploy publishes a different build than the one tested | The simulated local deploy consumes the artefact built and tested for the same commit, and rejects a swapped one | Artifacts between jobs | Deploy job rebuilds, or downloads by name without the commit |

Note: `blocking-migration` and `database-readiness` need more than one database connection; they are the right
moment to add a Docker Compose PostgreSQL next to PGlite.
