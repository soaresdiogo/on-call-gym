import { SCENARIOS } from '../../scenarios/index.js';
import { UsageError } from './errors.js';
import type { Level, ScenarioDefinition } from './scenario.js';

export const LEVEL_ORDER: readonly Level[] = ['junior', 'mid', 'senior'];

export function allScenarios(): readonly ScenarioDefinition[] {
  return SCENARIOS;
}

export function findScenario(id: string | undefined): ScenarioDefinition {
  if (!id) throw new UsageError('Missing scenario id. Run `npm run lab -- list` to see them.');
  const scenario = SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) throw new UsageError(`Unknown scenario "${id}". Run \`npm run lab -- list\` to see them.`);
  return scenario;
}
