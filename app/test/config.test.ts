import { describe, expect, it } from 'vitest';
import { ConfigError, loadConfig } from '../src/infrastructure/config.js';

describe('loadConfig', () => {
  it('accepts a complete configuration', () => {
    const config = loadConfig({ PAYMENT_PROVIDER_URL: 'http://127.0.0.1:4101', WEBHOOK_SECRET: 'a-long-enough-secret' });

    expect(config.paymentProviderUrl).toBe('http://127.0.0.1:4101');
  });

  it('lists every problem at once', () => {
    expect(() => loadConfig({ WEBHOOK_SECRET: 'short' })).toThrow(ConfigError);
    try {
      loadConfig({ WEBHOOK_SECRET: 'short' });
    } catch (error) {
      expect((error as ConfigError).problems).toHaveLength(2);
    }
  });
});
