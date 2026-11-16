import { buildStore, type Store } from '../../src/store.js';
import { startFakeProvider } from './fake-payment-provider.js';

export const TEST_WEBHOOK_SECRET = 'test-webhook-secret-0123456789';

export async function startTestStore(providerStatus = 201): Promise<{ store: Store; providerCalls: () => number; close: () => Promise<void> }> {
  const provider = await startFakeProvider(providerStatus);
  const store = await buildStore({ config: { paymentProviderUrl: provider.url, webhookSecret: TEST_WEBHOOK_SECRET } });
  return {
    store,
    providerCalls: provider.calls,
    close: async () => {
      await store.close();
      await provider.close();
    },
  };
}
