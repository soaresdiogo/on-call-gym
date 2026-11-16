import { findScenario } from '../core/catalog.js';
import { confirm } from '../core/confirm.js';
import { print, style } from '../core/console-output.js';
import { AttemptPaths } from '../core/paths.js';
import { stopStack } from '../core/stack-process.js';
import { createWorkspace, learnerChanges, removeAttempt, workspaceExists } from '../core/workspace.js';

export async function resetCommand(scenarioId: string | undefined, assumeYes: boolean): Promise<number> {
  const scenario = findScenario(scenarioId);
  const paths = new AttemptPaths(scenario.id);
  const changes = workspaceExists(paths) ? await learnerChanges(paths.workspace) : [];
  if (changes.length > 0) {
    print(`Your changes in ${scenario.id}:\n${changes.map((file) => `  ${file}`).join('\n')}`);
    if (!(await confirm('Reset discards these changes and the attempt data.', assumeYes))) {
      print('Reset cancelled. Nothing was changed.');
      return 1;
    }
  }
  await stopStack(paths);
  await removeAttempt(paths);
  await createWorkspace(scenario, paths.workspace);
  print(style.green(`${scenario.id} is back at its starting point (code and data).`));
  print(`Run: npm run lab -- start ${scenario.id}`);
  return 0;
}

export async function stopCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const stopped = await stopStack(new AttemptPaths(scenario.id));
  print(stopped ? `Stopped the services of ${scenario.id}. Your workspace is kept.` : `Nothing is running for ${scenario.id}.`);
  return 0;
}
