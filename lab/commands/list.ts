import { allScenarios, LEVEL_ORDER } from '../core/catalog.js';
import { print, style, table } from '../core/console-output.js';
import { AttemptPaths } from '../core/paths.js';
import { readStack } from '../core/stack-process.js';
import { workspaceExists } from '../core/workspace.js';

export async function listCommand(): Promise<number> {
  const scenarios = [...allScenarios()].sort(
    (left, right) => LEVEL_ORDER.indexOf(left.level) - LEVEL_ORDER.indexOf(right.level),
  );
  const rows = [['ID', 'LEVEL', 'TRACK', 'STATUS', 'TITLE']];
  for (const scenario of scenarios) {
    rows.push([scenario.id, scenario.level, scenario.kind === 'app' ? 'incident' : 'actions', await status(scenario.id), scenario.title]);
  }
  table(rows);
  print();
  print(style.dim(`${scenarios.length} scenarios. Start one with: npm run lab -- start <id>`));
  return 0;
}

async function status(scenarioId: string): Promise<string> {
  const paths = new AttemptPaths(scenarioId);
  if (await readStack(paths)) return 'running';
  return workspaceExists(paths) ? 'started' : '-';
}
