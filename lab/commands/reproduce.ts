import { findScenario } from '../core/catalog.js';
import { UsageError } from '../core/errors.js';
import { AttemptPaths } from '../core/paths.js';
import { readStack } from '../core/stack-process.js';
import { LAB_WEBHOOK_SECRET } from '../core/store-harness.js';
import { requireWorkspace } from './verify.js';

export async function reproduceCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const workspace = requireWorkspace(scenario);
  const stack = await readStack(new AttemptPaths(scenario.id));
  if (scenario.kind === 'app' && !stack) {
    throw new UsageError(`The store for ${scenario.id} is not running. Run: npm run lab -- start ${scenario.id}`);
  }
  await scenario.reproduce({
    workspace,
    storeUrl: stack?.storeUrl ?? '',
    providerUrl: stack?.providerUrl ?? '',
    controlUrl: stack?.controlUrl ?? '',
    webhookSecret: LAB_WEBHOOK_SECRET,
  });
  return 0;
}
