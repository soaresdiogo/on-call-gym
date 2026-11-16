import { copyFile, mkdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { findScenario } from '../core/catalog.js';
import { UsageError } from '../core/errors.js';
import { print, style } from '../core/console-output.js';
import { git } from '../core/git.js';
import { REPO_ROOT } from '../core/paths.js';
import { requireWorkspace } from './verify.js';

/** Copies one exercise workflow into .github/workflows so a real GitHub run can be observed. */
export async function installWorkflowCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  if (scenario.kind !== 'actions') throw new UsageError(`${scenario.id} is not a GitHub Actions challenge.`);
  const workspace = requireWorkspace(scenario);
  const branch = (await git(REPO_ROOT, ['rev-parse', '--abbrev-ref', 'HEAD'])).trim();
  if (branch === 'main') {
    throw new UsageError('You are on main. Create the exercise branch first: git switch -c gym/' + scenario.id);
  }
  const target = join(REPO_ROOT, '.github', 'workflows', `gym-${scenario.id}.yml`);
  await mkdir(join(REPO_ROOT, '.github', 'workflows'), { recursive: true });
  await copyFile(join(workspace, 'workflow.yml'), target);
  print(style.green(`Installed ${relative(REPO_ROOT, target)} on branch ${branch}.`));
  print('Next: commit it, push the branch to your fork and open a pull request into gym/base.');
  print('See docs/github-actions.md for the full procedure.');
  return 0;
}
