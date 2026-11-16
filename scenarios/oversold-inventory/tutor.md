# Tutor notes for oversold-inventory

## Signals worth steering toward

- Two `paid` orders for one unit; stock ends at 0, not negative, so "stock >= 0" checks pass.
- The availability check happens on data read before the payment; the stock write happens after it.
- The repository already has an atomic `reserve` (conditional `UPDATE ... RETURNING`).

## Common detours

- A `CHECK (stock >= 0)` constraint alone: here the write ignores its own result, so the constraint never fires.
- A transaction around the whole checkout including the payment call: holds locks across a network call.
- An in-memory mutex: works on one process, fails with two instances.

## Debrief questions

- Which two operations had to become one, and why?
- What is the compensation when the payment fails after the unit was reserved?
