import { randomUUID } from 'node:crypto';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { heading, print, style } from '../../lab/core/console-output.js';
import { checkout } from '../../lab/core/http-client.js';
import type { ScenarioDefinition, StackContext, VerifyContext } from '../../lab/core/scenario.js';
import { withHarness } from '../../lab/core/store-harness.js';
import { countRows, isSuccessStatus } from '../../lab/core/store-fixtures.js';

const CART = [{ productId: 'p-kettle', quantity: 1 }];
const COUNT_ORDERS = 'SELECT count(*)::int AS count FROM orders';

async function verify(context: VerifyContext): Promise<CheckResult[]> {
  return withHarness(context.workspace, {}, async (harness) => {
    const database = harness.store.database;
    // Arrange-Act: the shop sends one idempotency key per click; a double click repeats it.
    const sequentialKey = randomUUID();
    const before = await countRows(database, COUNT_ORDERS);
    const first = await checkout(harness.storeUrl, CART, sequentialKey);
    const repeated = await checkout(harness.storeUrl, CART, sequentialKey);
    const afterSequential = await countRows(database, COUNT_ORDERS);

    const concurrentKey = randomUUID();
    const concurrent = await Promise.all([checkout(harness.storeUrl, CART, concurrentKey), checkout(harness.storeUrl, CART, concurrentKey)]);
    const afterConcurrent = await countRows(database, COUNT_ORDERS);

    const fresh = await checkout(harness.storeUrl, CART, randomUUID());
    const afterFresh = await countRows(database, COUNT_ORDERS);
    const doubleCharged = [...harness.provider.chargesPerOrder().values()].filter((count) => count > 1).length;

    return [
      check('repeat-creates-one-order', 'recovery', 'Submitting the same attempt twice creates one order').passWhen(
        afterSequential - before === 1 && repeated.body.orderId === first.body.orderId,
        `${afterSequential - before} orders created; responses ${first.status} and ${repeated.status}`,
      ),
      check('concurrent-repeat-creates-one-order', 'recovery', 'Two simultaneous submissions of the same attempt create one order').passWhen(
        afterConcurrent - afterSequential === 1 && concurrent.every((result) => isSuccessStatus(result.status)),
        `${afterConcurrent - afterSequential} orders created; responses ${concurrent.map((result) => result.status).join(' and ')}`,
      ),
      check('new-attempt-works', 'regression', 'A new purchase attempt still creates a new order').passWhen(
        afterFresh - afterConcurrent === 1 && fresh.status === 201,
        `new attempt answered ${fresh.status}`,
      ),
      check('single-charge', 'regression', 'No order is charged twice').passWhen(doubleCharged === 0, `${doubleCharged} orders charged twice`),
    ];
  });
}

async function reproduce(context: StackContext): Promise<void> {
  const key = randomUUID();
  print(style.dim('A customer double-clicks "Buy": the shop sends the same request twice, with the same headers.'));
  const results = [await checkout(context.storeUrl, CART, key), await checkout(context.storeUrl, CART, key)];
  heading('Responses');
  for (const result of results) print(`${result.status} order ${String(result.body.orderId)}`);
  print(style.dim('Same click, how many orders? Compare with what public/shop.js sends.'));
}

export const doubleSubmit: ScenarioDefinition = {
  id: 'double-submit',
  title: 'A double click creates two orders',
  level: 'junior',
  kind: 'app',
  prerequisites: ['HTTP headers', 'Browser developer tools (Network tab)'],
  objective: 'Understand idempotency keys end to end, from the button to the database constraint.',
  readings: [
    {
      title: 'IETF draft - The Idempotency-Key HTTP Header Field',
      url: 'https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/',
    },
    { title: 'Stripe API docs - Idempotent requests', url: 'https://docs.stripe.com/api/idempotent_requests' },
  ],
  expectedFailures: ['repeat-creates-one-order', 'concurrent-repeat-creates-one-order'],
  verify,
  reproduce,
};
