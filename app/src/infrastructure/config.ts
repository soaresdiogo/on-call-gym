export interface StoreConfig {
  readonly paymentProviderUrl: string;
  readonly webhookSecret: string;
}

const MIN_WEBHOOK_SECRET_LENGTH = 16;

export class ConfigError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid configuration: ${problems.join('; ')}`);
  }
}

/** Validates the environment at boot, before the store accepts traffic. */
export function loadConfig(env: NodeJS.ProcessEnv): StoreConfig {
  const problems = [...urlProblems(env.PAYMENT_PROVIDER_URL), ...secretProblems(env.WEBHOOK_SECRET)];
  if (problems.length > 0) {
    throw new ConfigError(problems);
  }
  return { paymentProviderUrl: env.PAYMENT_PROVIDER_URL ?? '', webhookSecret: env.WEBHOOK_SECRET ?? '' };
}

function urlProblems(value: string | undefined): string[] {
  if (!value) return ['PAYMENT_PROVIDER_URL is required'];
  if (!URL.canParse(value)) return ['PAYMENT_PROVIDER_URL must be a valid URL'];
  return [];
}

function secretProblems(value: string | undefined): string[] {
  if (!value || value.length < MIN_WEBHOOK_SECRET_LENGTH) {
    return [`WEBHOOK_SECRET must have at least ${MIN_WEBHOOK_SECRET_LENGTH} characters`];
  }
  return [];
}
