import { randomUUID } from 'node:crypto';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { heading, print, style } from '../../lab/core/console-output.js';
import { checkout, requestJson, type HttpResult } from '../../lab/core/http-client.js';
import type { ScenarioDefinition, StackContext, VerifyContext } from '../../lab/core/scenario.js';
import { withHarness, type StoreHarness } from '../../lab/core/store-harness.js';
import { countRows } from '../../lab/core/store-fixtures.js';

const PRODUCT_ID = 'p-grinder';
const LAST_UNIT_SETUP = `UPDATE products SET stock = 1 WHERE id = '${PRODUCT_ID}'`;
// Both buyers' payment calls are held until both arrive (or 500 ms pass), so the race happens every time.
const BOTH_BUYERS_AT_ONCE = { holdUntilConcurrent: { parties: 2, timeoutMs: 500 } };
const HTTP_CONFLICT = 409;

async function verify(context: VerifyContext): Promise<CheckResult[]> {
  return withHarness(context.workspace, { behavior: BOTH_BUYERS_AT_ONCE }, async (harness) => [
    ...(await raceChecks(harness)),
    ...(await compensationChecks(harness)),
  ]);
}

async function raceChecks(harness: StoreHarness): Promise<CheckResult[]> {
  await harness.store.database.query(LAST_UNIT_SETUP);
  const results = await buyTogether(harness.storeUrl);
  const accepted = results.filter((result) => result.status === 201).length;
  const rejected = results.filter((result) => result.status === HTTP_CONFLICT).length;
  const stock = await stockLeft(harness);
  const sold = await unitsSold(harness);
  return [
    check('single-sale', 'recovery', 'Only one of two simultaneous buyers gets the last unit').passWhen(
      accepted === 1,
      `responses: ${results.map((result) => result.status).join(' and ')}`,
    ),
    check('loser-told-out-of-stock', 'recovery', 'The other buyer is told the product is out of stock (409)').passWhen(
      rejected === 1,
      `${rejected} buyer(s) got 409`,
    ),
    check('inventory-consistent', 'recovery', 'Units sold plus units left equal the one unit we had').passWhen(
      sold + stock === 1 && stock >= 0,
      `${sold} sold, ${stock} left in stock`,
    ),
  ];
}

/** Regression: a failed payment must give the unit back, and the unit must stay sellable. */
async function compensationChecks(harness: StoreHarness): Promise<CheckResult[]> {
  await harness.store.database.query(LAST_UNIT_SETUP);
  harness.provider.configure({ holdUntilConcurrent: null, outage: true });
  const failedPayment = await checkout(harness.storeUrl, [{ productId: PRODUCT_ID, quantity: 1 }], randomUUID());
  const stockAfterFailure = await stockLeft(harness);
  harness.provider.configure({ outage: false });
  const retry = await checkout(harness.storeUrl, [{ productId: PRODUCT_ID, quantity: 1 }], randomUUID());
  return [
    check('failed-payment-releases-unit', 'regression', 'A failed payment does not keep the unit').passWhen(
      failedPayment.status !== 201 && stockAfterFailure === 1,
      `payment failed with ${failedPayment.status}; stock is ${stockAfterFailure}`,
    ),
    check('last-unit-still-sellable', 'regression', 'The last unit can still be bought afterwards').passWhen(
      retry.status === 201 && (await stockLeft(harness)) === 0,
      `next checkout answered ${retry.status}`,
    ),
  ];
}

function buyTogether(storeUrl: string): Promise<HttpResult[]> {
  return Promise.all([1, 2].map(() => checkout(storeUrl, [{ productId: PRODUCT_ID, quantity: 1 }], randomUUID())));
}

async function stockLeft(harness: StoreHarness): Promise<number> {
  const rows = await harness.store.database.query<{ stock: number }>('SELECT stock FROM products WHERE id = $1', [PRODUCT_ID]);
  return rows[0]?.stock ?? Number.NaN;
}

function unitsSold(harness: StoreHarness): Promise<number> {
  return countRows(
    harness.store.database,
    `SELECT coalesce(sum(l.quantity), 0)::int AS count FROM order_lines l JOIN orders o ON o.id = l.order_id
     WHERE o.status = 'paid' AND l.product_id = $1`,
    [PRODUCT_ID],
  );
}

async function reproduce(context: StackContext): Promise<void> {
  await requestJson(`${context.controlUrl}/setup`, { method: 'POST' });
  await requestJson(`${context.providerUrl}/__lab/behavior`, { method: 'POST', body: BOTH_BUYERS_AT_ONCE });
  print(style.dim('One Burr Grinder left. Two customers press "Buy" at the same moment.'));
  const results = await buyTogether(context.storeUrl);
  await requestJson(`${context.providerUrl}/__lab/behavior`, { method: 'POST', body: { holdUntilConcurrent: null } });
  heading('Responses');
  for (const result of results) print(`${result.status} ${JSON.stringify(result.body)}`);
  const products = await requestJson(`${context.storeUrl}/products`);
  const grinder = (products.body.products as { id: string; available: boolean }[] | undefined)?.find((product) => product.id === PRODUCT_ID);
  print(style.dim(`The shop now shows the grinder as ${grinder?.available ? 'available' : 'sold out'}. How many units did we have?`));
}

export const oversoldInventory: ScenarioDefinition = {
  id: 'oversold-inventory',
  title: 'Two buyers get the last unit',
  level: 'senior',
  kind: 'app',
  prerequisites: ['SQL UPDATE and transactions', 'Race conditions', 'Compensating actions'],
  objective: 'Find a check-then-act race, and fix it with an atomic conditional write plus compensation.',
  readings: [
    { title: 'PostgreSQL docs - Transaction Isolation', url: 'https://www.postgresql.org/docs/current/transaction-iso.html' },
    { title: 'PostgreSQL docs - UPDATE (RETURNING)', url: 'https://www.postgresql.org/docs/current/sql-update.html' },
  ],
  expectedFailures: ['single-sale', 'loser-told-out-of-stock', 'inventory-consistent'],
  stackSetup: [LAST_UNIT_SETUP],
  verify,
  reproduce,
};
