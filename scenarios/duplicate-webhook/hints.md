# Hints for duplicate-webhook

## Hint 1

Is a provider allowed to send the same event twice? Run `npm run lab -- reproduce duplicate-webhook`
and look at what identifies an event in the payload, compared with what identifies an order.

## Hint 2

Count rows per order in the `shipments` table and check the `webhook_events` table: what is it for, and does
anything write to it during a delivery? Follow one delivery through the webhook handler line by line.

## Hint 3

Read Stripe's guidance on duplicate events (in the readings). Then ask: if two deliveries arrive at the same
moment, which part of the system guarantees only one of them wins? `INSERT ... ON CONFLICT` is worth a look.
