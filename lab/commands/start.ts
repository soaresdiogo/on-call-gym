import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { findScenario } from '../core/catalog.js';
import { heading, print, style } from '../core/console-output.js';
import { AttemptPaths, REPO_ROOT, scenarioDirectory } from '../core/paths.js';
import type { ScenarioDefinition } from '../core/scenario.js';
import { startStack, stopOtherStacks, stopStack, type StackInfo } from '../core/stack-process.js';
import { createWorkspace, workspaceExists } from '../core/workspace.js';

export async function startCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const paths = new AttemptPaths(scenario.id);
  const resuming = workspaceExists(paths);
  if (!resuming) await createWorkspace(scenario, paths.workspace);

  print(style.dim(resuming ? `Resuming your attempt at ${scenario.id}.` : `Prepared a fresh attempt at ${scenario.id}.`));
  print(await readFile(join(scenarioDirectory(scenario.id), 'brief.md'), 'utf8'));
  heading('Where to work');
  print(`  ${relative(REPO_ROOT, paths.workspace)}/`);
  print(style.dim('  Your own copy of the code under investigation. The main checkout is never touched.'));

  if (scenario.kind === 'app') {
    printServices(await restartStack(scenario, paths), paths);
  }
  printCommands(scenario);
  return 0;
}

async function restartStack(scenario: ScenarioDefinition, paths: AttemptPaths): Promise<StackInfo> {
  for (const stopped of await stopOtherStacks(scenario.id)) print(style.dim(`Stopped the running stack of ${stopped}.`));
  await stopStack(paths);
  return startStack(paths);
}

function printServices(stack: StackInfo, paths: AttemptPaths): void {
  heading('Services (loopback only)');
  print(`  Store              ${stack.storeUrl}`);
  print(`  Dashboard          ${stack.storeUrl}/dashboard`);
  print(`  Metrics (JSON)     ${stack.storeUrl}/metrics`);
  print(`  Payment provider   ${stack.providerUrl}  (simulator)`);
  print(`  Store logs (JSON)  ${relative(REPO_ROOT, paths.storeLog)}`);
  print(style.dim('  After you edit the code, run start again to restart the store with your changes.'));
}

function printCommands(scenario: ScenarioDefinition): void {
  heading('Useful commands');
  const commands = [
    [`reproduce ${scenario.id}`, 'show the symptom'],
    [`hint ${scenario.id}`, 'next hint (three in total)'],
    [`verify ${scenario.id}`, 'check your fix'],
    ...(scenario.kind === 'actions' ? [[`install-workflow ${scenario.id}`, 'copy your workflow to .github/workflows on an exercise branch']] : []),
    [`reset ${scenario.id}`, 'back to the starting point (asks first)'],
    [`stop ${scenario.id}`, 'stop the services'],
  ];
  for (const [command, purpose] of commands) print(`  npm run lab -- ${(command ?? '').padEnd(32)} ${style.dim(purpose ?? '')}`);
  print();
  print(style.dim(`Stuck? Open \`claude\` here and run /incident-tutor ${scenario.id}`));
}
