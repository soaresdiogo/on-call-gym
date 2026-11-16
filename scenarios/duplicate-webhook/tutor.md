# Tutor notes for duplicate-webhook

## Signals worth steering toward

- Two `webhook handled` log lines with the same `eventId`, both `shipment_created`.
- The `webhook_events` table exists and stays empty.
- At-least-once delivery is the norm for webhooks; the provider is behaving correctly.

## Common detours

- Answering 409 or 500 to the duplicate: the provider keeps retrying.
- "Check if a shipment exists, then create": two simultaneous deliveries both pass the check.
- Deduplicating by order id: a later, different event for the same order would be lost.

## Debrief questions

- What makes the dedupe safe when two deliveries race?
- What happens if shipping fails after the event was recorded?
