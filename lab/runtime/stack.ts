import { existsSync } from 'node:fs';
import Fastify from 'fastify';
import { rm, writeFile } from 'node:fs/promises';
import { findScenario } from '../core/catalog.js';
import { AttemptPaths } from '../core/paths.js';
import type { StackInfo } from '../core/stack-process.js';
import { startHarness } from '../core/store-harness.js';

const DEFAULT_STORE_PORT = 4100;
const DEFAULT_PROVIDER_PORT = 4101;
const DEFAULT_CONTROL_PORT = 4102;

// Background process started by `npm run lab -- start`: the learner's store plus the payment simulator.
const scenario = findScenario(process.argv[2]);
const paths = new AttemptPaths(scenario.id);
const freshDatabase = !existsSync(paths.database);

const harness = await startHarness(paths.workspace, {
  databaseDirectory: paths.database,
  logFile: paths.storeLog,
  storePort: Number(process.env.GYM_STORE_PORT ?? DEFAULT_STORE_PORT),
  providerPort: Number(process.env.GYM_PROVIDER_PORT ?? DEFAULT_PROVIDER_PORT),
});
async function runSetup(): Promise<void> {
  for (const statement of scenario.stackSetup ?? []) await harness.store.database.query(statement);
}
if (freshDatabase) await runSetup();

// Loopback-only control port: it can only re-run the scenario's fixed setup statements.
const control = Fastify({ logger: false, forceCloseConnections: true });
control.post('/setup', async () => {
  await runSetup();
  return { setup: true };
});
const controlUrl = await control.listen({ host: '127.0.0.1', port: Number(process.env.GYM_CONTROL_PORT ?? DEFAULT_CONTROL_PORT) });

const info: StackInfo = { pid: process.pid, scenarioId: scenario.id, storeUrl: harness.storeUrl, providerUrl: harness.provider.url, controlUrl };
await writeFile(paths.stackFile, JSON.stringify(info, null, 2));
console.log(`Stack for ${scenario.id} ready: store ${harness.storeUrl}, payment provider ${harness.provider.url}`);

async function shutdown(): Promise<void> {
  await control.close();
  await harness.close();
  await rm(paths.stackFile, { force: true });
  process.exit(0);
}

process.once('SIGTERM', () => void shutdown());
process.once('SIGINT', () => void shutdown());
