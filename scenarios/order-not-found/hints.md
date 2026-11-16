# Hints for order-not-found

## Hint 1

Start from the alert: which status code, on which route? Run `npm run lab -- reproduce order-not-found`
and compare the answer for an unknown order with the answer for one you just bought.

## Hint 2

Find the request in `.gym/attempts/order-not-found/runtime/store.log` (search for `unhandled error`).
The error name and the first lines of its stack tell you which function received something it did not expect.

## Hint 3

Which status code means "the server is fine, the thing you asked for does not exist"? Read the 404
section of RFC 9110 (in the readings), then look at how the store turns its own domain errors into
HTTP answers.
