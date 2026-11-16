import { randomUUID } from 'node:crypto';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { heading, print, style } from '../../lab/core/console-output.js';
import type { ScenarioDefinition, StackContext, VerifyContext } from '../../lab/core/scenario.js';
import { LAB_WEBHOOK_SECRET, withHarness } from '../../lab/core/store-harness.js';
import { countRows, isSuccessStatus, placePaidOrder, sendPaymentWebhook } from '../../lab/core/store-fixtures.js';

const COUNT_SHIPMENTS = 'SELECT count(*)::int AS count FROM shipments WHERE order_id = $1';

async function verify(context: VerifyContext): Promise<CheckResult[]> {
  return withHarness(context.workspace, {}, async (harness) => {
    const { storeUrl, store } = harness;
    const send = (id: string, orderId: string) => sendPaymentWebhook(storeUrl, LAB_WEBHOOK_SECRET, { id, orderId });

    const sequentialOrder = await placePaidOrder(storeUrl);
    const sequentialEvent = `evt_${randomUUID()}`;
    const deliveries = [await send(sequentialEvent, sequentialOrder), await send(sequentialEvent, sequentialOrder)];

    const concurrentOrder = await placePaidOrder(storeUrl);
    const concurrentEvent = `evt_${randomUUID()}`;
    await Promise.all([send(concurrentEvent, concurrentOrder), send(concurrentEvent, concurrentOrder)]);

    const otherOrder = await placePaidOrder(storeUrl);
    const distinct = await send(`evt_${randomUUID()}`, otherOrder);

    const sequentialShipments = await countRows(store.database, COUNT_SHIPMENTS, [sequentialOrder]);
    const concurrentShipments = await countRows(store.database, COUNT_SHIPMENTS, [concurrentOrder]);
    const otherShipments = await countRows(store.database, COUNT_SHIPMENTS, [otherOrder]);
    return [
      check('redelivery-ships-once', 'recovery', 'The same event delivered twice creates one shipment').passWhen(
        sequentialShipments === 1,
        `${sequentialShipments} shipments after two deliveries of ${sequentialEvent}`,
      ),
      check('concurrent-redelivery-ships-once', 'recovery', 'Two simultaneous deliveries of one event create one shipment').passWhen(
        concurrentShipments === 1,
        `${concurrentShipments} shipments after two simultaneous deliveries`,
      ),
      check('redelivery-acknowledged', 'regression', 'A repeated delivery is still acknowledged with 2xx, so the provider stops retrying').passWhen(
        deliveries.every((delivery) => isSuccessStatus(delivery.status)),
        `delivery statuses: ${deliveries.map((delivery) => delivery.status).join(', ')}`,
      ),
      check('distinct-event-ships', 'regression', 'A different event still creates its shipment').passWhen(
        isSuccessStatus(distinct.status) && otherShipments === 1,
        `distinct event answered ${distinct.status}, ${otherShipments} shipment(s)`,
      ),
    ];
  });
}

async function reproduce(context: StackContext): Promise<void> {
  const orderId = await placePaidOrder(context.storeUrl);
  const eventId = `evt_${randomUUID()}`;
  print(style.dim(`The provider delivers ${eventId} for order ${orderId}, does not get our answer in time, and delivers it again.`));
  heading('Deliveries');
  for (let delivery = 1; delivery <= 2; delivery += 1) {
    const result = await sendPaymentWebhook(context.storeUrl, context.webhookSecret, { id: eventId, orderId });
    print(`delivery ${delivery}: ${result.status} ${JSON.stringify(result.body)}`);
  }
  print(style.dim('Search the store log for this orderId. How many shipments were created?'));
}

export const duplicateWebhook: ScenarioDefinition = {
  id: 'duplicate-webhook',
  title: 'The same webhook ships the order twice',
  level: 'mid',
  kind: 'app',
  prerequisites: ['Webhooks', 'Unique constraints in SQL'],
  objective: 'Design consumers for at-least-once delivery: deduplicate by event id, atomically.',
  readings: [
    { title: 'Stripe docs - Receive events: handle duplicate events', url: 'https://docs.stripe.com/webhooks#handle-duplicate-events' },
    { title: 'PostgreSQL docs - INSERT ... ON CONFLICT', url: 'https://www.postgresql.org/docs/current/sql-insert.html#SQL-ON-CONFLICT' },
  ],
  expectedFailures: ['redelivery-ships-once', 'concurrent-redelivery-ships-once'],
  verify,
  reproduce,
};
