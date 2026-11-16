import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { findScenario } from '../core/catalog.js';
import { confirm } from '../core/confirm.js';
import { heading, print, style } from '../core/console-output.js';
import { diffFiles } from '../core/git.js';
import { REPO_ROOT, scenarioDirectory } from '../core/paths.js';
import { applyReferenceSolution, brokenFile, faultyFiles, referenceFile } from '../core/workspace.js';
import { requireWorkspace } from './verify.js';

/** Spoilers stay behind --reveal so nobody reads the answer by accident. */
export async function solutionCommand(scenarioId: string | undefined, flags: ReadonlySet<string>): Promise<number> {
  const scenario = findScenario(scenarioId);
  if (flags.has('apply')) return applySolution(scenarioId, flags.has('yes'));
  if (!flags.has('reveal')) {
    print(`This shows the post-mortem and the reference fix for ${scenario.id}.`);
    print(`Run it after you verified your own fix: npm run lab -- solution ${scenario.id} --reveal`);
    return 0;
  }
  print(await readFile(join(scenarioDirectory(scenario.id), 'solution', 'postmortem.md'), 'utf8'));
  heading('Reference fix');
  for (const file of await faultyFiles(scenario)) {
    print(await diffFiles(relative(REPO_ROOT, brokenFile(scenario, file)), relative(REPO_ROOT, referenceFile(scenario, file)), REPO_ROOT));
  }
  const automation = join(scenarioDirectory(scenario.id), 'automation', 'reference');
  if (existsSync(automation)) print(style.dim(`Reference automation: ${relative(REPO_ROOT, automation)}/`));
  return 0;
}

async function applySolution(scenarioId: string | undefined, assumeYes: boolean): Promise<number> {
  const scenario = findScenario(scenarioId);
  const workspace = requireWorkspace(scenario);
  if (!(await confirm(`Overwrite the faulty files in your ${scenario.id} workspace with the reference fix?`, assumeYes))) {
    print('Nothing was changed.');
    return 1;
  }
  const files = await applyReferenceSolution(scenario, workspace);
  print(`Applied the reference fix to: ${files.join(', ')}`);
  if (scenario.kind === 'app') print(`Restart the store to load it: npm run lab -- start ${scenario.id}`);
  return 0;
}
