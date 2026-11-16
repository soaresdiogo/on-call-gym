# Hints for double-submit

## Hint 1

Run `npm run lab -- reproduce double-submit`, or click "Buy" twice quickly at http://127.0.0.1:4100.
Do both responses point to the same order? What would have to be true for the store to recognise
the second request as a repeat?

## Hint 2

Open the browser's Network tab (or read `public/shop.js`) and write down the exact headers the shop sends
with `POST /checkout`. Then find where the store reads them. Compare the two lists letter by letter.

## Hint 3

Read how idempotency keys work in the Stripe docs or the IETF draft (in the readings). The key only helps if
the server receives it and stores it with a uniqueness guarantee, including when two requests arrive together.
