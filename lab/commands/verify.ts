import { findScenario } from '../core/catalog.js';
import { UsageError } from '../core/errors.js';
import { AttemptPaths } from '../core/paths.js';
import { printReport } from '../core/report.js';
import type { ScenarioDefinition } from '../core/scenario.js';
import { EXIT_CODES, runChecks, verifyScenario } from '../core/verification.js';
import { workspaceExists } from '../core/workspace.js';

export async function verifyCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const workspace = requireWorkspace(scenario);
  const report = await verifyScenario(scenario, { workspace });
  printReport(`Verifying ${scenario.id}`, report);
  return EXIT_CODES[report.verdict];
}

export async function automateCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const automation = scenario.automation;
  if (!automation) throw new UsageError(`${scenario.id} has no executable automation exercise yet; see its post-mortem for ideas.`);
  const workspace = requireWorkspace(scenario);
  const report = await runChecks((context) => automation.evaluate(context), { workspace });
  printReport(`Evaluating your automation (${automation.entry}) for ${scenario.id}`, report);
  return EXIT_CODES[report.verdict];
}

export function requireWorkspace(scenario: ScenarioDefinition): string {
  const paths = new AttemptPaths(scenario.id);
  if (!workspaceExists(paths)) throw new UsageError(`No attempt at ${scenario.id} yet. Run: npm run lab -- start ${scenario.id}`);
  return paths.workspace;
}
