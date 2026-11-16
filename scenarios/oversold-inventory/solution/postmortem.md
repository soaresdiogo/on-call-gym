# Post-mortem: oversold-inventory

**Impact.** Two customers were charged for the last unit. One order had to be cancelled and refunded, with
an apology, on launch day.

**Root cause.** Check-then-act across a slow call. Checkout read the stock while pricing the cart, charged the
card, and only then decremented the stock with `reserve`, ignoring its result. Both buyers read "1 left" before
either payment finished, both were charged, and the second decrement silently did nothing.

**Mitigation.** Reserve first with one conditional statement
(`UPDATE products SET stock = stock - $2 WHERE id = $1 AND stock >= $2 RETURNING id`). The loser gets 409 before
any charge. If the payment fails, the reservation is released.

**Prevention.**
- Never act on a value read before a network call without re-checking it atomically.
- Never ignore the result of a conditional write.
- Test with a concurrency barrier, not with luck: hold both requests at the slow step and release them together.
- Add `CHECK (stock >= 0)` as a second line of defence.

**Automation idea.** A reusable "two at once" test helper that holds any pair of requests at a dependency call,
then asserts an invariant. Ask AI to generate invariants for other resources (coupons, seats).
