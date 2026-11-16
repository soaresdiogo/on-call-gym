# Hints for retry-storm

## Hint 1

Demand did not change, but calls to the payment provider did. Compare two numbers for the same
period: checkouts arriving at the store and calls arriving at the provider. Run
`npm run lab -- reproduce retry-storm` and look at the ratio, or open the dashboard.

## Hint 2

Pick one failed order in the store log (`.gym/attempts/retry-storm/runtime/store.log`) and follow its
`orderId` through every line. How many payment attempts did it make, how long did each one get, and how
much time passed between them? Compare that with how long the provider takes right now.

## Hint 3

Read about timeouts, retries and backoff with jitter (the Amazon Builders' Library article in the
readings). Ask yourself three questions about the client that calls the provider: is the timeout
longer than a slow-but-healthy answer, how many times can one order retry, and do retries wait?
