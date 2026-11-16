import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { FastifyInstance } from 'fastify';
import { LOOPBACK, PaymentProviderSimulator, type ProviderBehavior } from '../simulators/payment-provider.js';
import { InfrastructureError } from './errors.js';

/** Fictional secret for the lab's signed webhooks; it protects nothing real. */
export const LAB_WEBHOOK_SECRET = 'on-call-gym-local-webhook-secret';

export interface SqlClient {
  query<Row>(sql: string, params?: unknown[]): Promise<Row[]>;
}

export interface WorkspaceStore {
  readonly app: FastifyInstance;
  readonly database: SqlClient;
  close(): Promise<void>;
}

interface StoreModule {
  buildStore(options: {
    config: { paymentProviderUrl: string; webhookSecret: string };
    databaseDirectory?: string;
    logFile?: string;
  }): Promise<WorkspaceStore>;
}

export interface StoreHarness {
  readonly store: WorkspaceStore;
  readonly provider: PaymentProviderSimulator;
  readonly storeUrl: string;
  close(): Promise<void>;
}

export interface HarnessOptions {
  readonly behavior?: Partial<ProviderBehavior>;
  readonly databaseDirectory?: string;
  readonly logFile?: string;
  readonly storePort?: number;
  readonly providerPort?: number;
}

/** Loads the store from a workspace; a store that cannot load is "not verified", never a pass. */
export async function loadStoreModule(workspace: string): Promise<StoreModule> {
  try {
    const module = (await import(pathToFileURL(join(workspace, 'src', 'store.ts')).href)) as Partial<StoreModule>;
    if (typeof module.buildStore !== 'function') throw new Error('src/store.ts no longer exports buildStore');
    return module as StoreModule;
  } catch (error) {
    throw new InfrastructureError(`The store in your workspace failed to load: ${messageOf(error)}`);
  }
}

/** Boots the payment provider simulator and the workspace store on loopback ports. */
export async function startHarness(workspace: string, options: HarnessOptions = {}): Promise<StoreHarness> {
  const module = await loadStoreModule(workspace);
  const provider = await PaymentProviderSimulator.start(options.providerPort ?? 0, options.behavior);
  try {
    const store = await module.buildStore({
      config: { paymentProviderUrl: provider.url, webhookSecret: LAB_WEBHOOK_SECRET },
      ...(options.databaseDirectory ? { databaseDirectory: options.databaseDirectory } : {}),
      ...(options.logFile ? { logFile: options.logFile } : {}),
    });
    const storeUrl = await store.app.listen({ host: LOOPBACK, port: options.storePort ?? 0 });
    return { store, provider, storeUrl, close: () => closeAll(store, provider) };
  } catch (error) {
    await provider.close();
    throw new InfrastructureError(`The store in your workspace did not start: ${messageOf(error)}`);
  }
}

/** Runs `work` against a fresh harness and always shuts it down. */
export async function withHarness<Result>(
  workspace: string,
  options: HarnessOptions,
  work: (harness: StoreHarness) => Promise<Result>,
): Promise<Result> {
  const harness = await startHarness(workspace, options);
  try {
    return await work(harness);
  } finally {
    await harness.close();
  }
}

async function closeAll(store: WorkspaceStore, provider: PaymentProviderSimulator): Promise<void> {
  await store.close();
  await provider.close();
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
