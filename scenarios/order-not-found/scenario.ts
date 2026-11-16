import { randomUUID } from 'node:crypto';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { heading, print, style } from '../../lab/core/console-output.js';
import { requestJson } from '../../lab/core/http-client.js';
import type { ScenarioDefinition, StackContext, VerifyContext } from '../../lab/core/scenario.js';
import { withHarness } from '../../lab/core/store-harness.js';
import { placePaidOrder } from '../../lab/core/store-fixtures.js';

async function verify(context: VerifyContext): Promise<CheckResult[]> {
  return withHarness(context.workspace, {}, async (harness) => {
    const existingId = await placePaidOrder(harness.storeUrl);
    const missing = await requestJson(`${harness.storeUrl}/orders/${randomUUID()}`);
    const existing = await requestJson(`${harness.storeUrl}/orders/${existingId}`);
    const malformed = await requestJson(`${harness.storeUrl}/orders/not-an-order-id`);
    return [
      check('missing-order-404', 'recovery', 'An order that does not exist answers 404 with an error code').passWhen(
        missing.status === 404 && missing.body.error === 'not_found',
        `GET /orders/<unknown id> answered ${missing.status} ${JSON.stringify(missing.body)}`,
      ),
      check('existing-order-200', 'regression', 'An existing order is still returned').passWhen(
        existing.status === 200 && existing.body.id === existingId,
        `GET /orders/<existing id> answered ${existing.status}`,
      ),
      check('malformed-id-400', 'regression', 'A malformed id is rejected as a bad request').passWhen(
        malformed.status === 400,
        `GET /orders/not-an-order-id answered ${malformed.status}`,
      ),
      check('no-internal-details', 'regression', 'Error responses do not leak internal details').passWhen(
        !JSON.stringify(missing.body).match(/TypeError|at .*\.ts|stack/i),
        `body: ${JSON.stringify(missing.body)}`,
      ),
    ];
  });
}

async function reproduce(context: StackContext): Promise<void> {
  const id = randomUUID();
  print(style.dim(`A customer opens the tracking link of an order that does not exist: /orders/${id}`));
  const result = await requestJson(`${context.storeUrl}/orders/${id}`);
  heading('Response');
  print(`${result.status} ${JSON.stringify(result.body)}`);
  print(style.dim('Now look at the store log for this request.'));
}

export const orderNotFound: ScenarioDefinition = {
  id: 'order-not-found',
  title: 'Looking up an unknown order returns 500',
  level: 'junior',
  kind: 'app',
  prerequisites: ['HTTP status codes', 'Reading a stack trace'],
  objective: 'Tell client errors from server errors, and make "not found" an expected outcome instead of a crash.',
  readings: [
    { title: 'RFC 9110 - HTTP Semantics, 404 Not Found', url: 'https://www.rfc-editor.org/rfc/rfc9110#name-404-not-found' },
    { title: 'Fastify docs - Errors', url: 'https://fastify.dev/docs/latest/Reference/Errors/' },
  ],
  expectedFailures: ['missing-order-404'],
  verify,
  reproduce,
};
