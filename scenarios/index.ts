import type { ScenarioDefinition } from '../lab/core/scenario.js';
import { doubleSubmit } from './double-submit/scenario.js';
import { duplicateWebhook } from './duplicate-webhook/scenario.js';
import { falseGreen } from './false-green/scenario.js';
import { orderNotFound } from './order-not-found/scenario.js';
import { oversoldInventory } from './oversold-inventory/scenario.js';
import { retryStorm } from './retry-storm/scenario.js';

/** The catalog. Add a scenario here after creating its folder from docs/scenario-template.md. */
export const SCENARIOS: readonly ScenarioDefinition[] = [
  orderNotFound,
  doubleSubmit,
  falseGreen,
  retryStorm,
  duplicateWebhook,
  oversoldInventory,
];
