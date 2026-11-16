# Hints for oversold-inventory

## Hint 1

Run `npm run lab -- reproduce oversold-inventory` (it restores the single unit first). Both requests start
from the same stock. Where in the checkout does the store decide "there is enough stock", and where does it
actually take the unit?

## Hint 2

Write down the order of operations in the checkout for one buyer, then interleave two buyers step by step on
paper. What does each of them read, and what does each of them write? How long is the gap between the
check and the write?

## Hint 3

Read about isolation in the PostgreSQL docs (in the readings). Can the check and the write be one statement
that only succeeds when the stock is still there? And if the payment then fails, who gives the unit back?
