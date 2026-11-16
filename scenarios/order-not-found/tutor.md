# Tutor notes for order-not-found

## Signals worth steering toward

- `unhandled error` in the log with a `TypeError` for the failing request.
- The repository returns `null` for an unknown id; the caller assumes an order.
- The store already maps domain errors to status codes in one place.

## Common detours

- Catching every error in the route and answering 404: a database outage would then look like "not found".
- Answering 200 with an empty body: clients and caches cannot tell it from a real order.

## Debrief questions

- What makes a 4xx different from a 5xx for whoever is on call?
- Where should the decision "this order does not exist" live, and why there?
