import { existsSync } from 'node:fs';
import { cp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { git } from './git.js';
import { APP_DIRECTORY, scenarioDirectory, type AttemptPaths } from './paths.js';
import type { ScenarioDefinition } from './scenario.js';

const START_TAG = 'gym-start';
const APP_FOLDERS = ['src', 'public'] as const;

/** Copies the healthy store, applies the scenario's fault and commits it as the known starting point. */
export async function createWorkspace(scenario: ScenarioDefinition, workspace: string): Promise<void> {
  await copyBase(scenario, workspace);
  await cp(join(scenarioDirectory(scenario.id), 'broken'), workspace, { recursive: true, force: true });
  await copyAutomationStarter(scenario, workspace);
  await writeFile(join(workspace, 'README.md'), await workspaceReadme(scenario));
  await git(workspace, ['init', '--quiet', '--initial-branch', 'main']);
  await git(workspace, ['add', '--all']);
  await git(workspace, ['commit', '--quiet', '--message', `Start ${scenario.id}`]);
  await git(workspace, ['tag', START_TAG]);
}

export type CodeVersion = 'broken' | 'reference';

/** A throwaway copy of one version of the scenario code, for meta-tests and automation recordings. */
export async function materializeVersion(scenario: ScenarioDefinition, directory: string, version: CodeVersion): Promise<void> {
  await copyBase(scenario, directory);
  await cp(join(scenarioDirectory(scenario.id), 'broken'), directory, { recursive: true, force: true });
  if (version === 'reference') await applyReferenceSolution(scenario, directory);
}

export function workspaceExists(paths: AttemptPaths): boolean {
  return existsSync(join(paths.workspace, '.git'));
}

/** Files that differ from the starting point, committed or not. */
export async function learnerChanges(workspace: string): Promise<string[]> {
  const committed = await git(workspace, ['diff', '--name-only', START_TAG]);
  const untracked = await git(workspace, ['ls-files', '--others', '--exclude-standard']);
  return [...new Set([...lines(committed), ...lines(untracked)])];
}

export async function removeAttempt(paths: AttemptPaths): Promise<void> {
  await rm(paths.attempt, { recursive: true, force: true });
}

/** Replaces every faulty file with its reference version. */
export async function applyReferenceSolution(scenario: ScenarioDefinition, workspace: string): Promise<string[]> {
  const files = await faultyFiles(scenario);
  for (const file of files) {
    await cp(referenceFile(scenario, file), join(workspace, file), { force: true });
  }
  return files;
}

export async function faultyFiles(scenario: ScenarioDefinition): Promise<string[]> {
  const brokenRoot = join(scenarioDirectory(scenario.id), 'broken');
  const entries = await readdir(brokenRoot, { recursive: true, withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => relative(brokenRoot, join(entry.parentPath, entry.name)))
    .sort();
}

/** App scenarios are fixed by the healthy store; Actions challenges keep their fix next to the scenario. */
export function referenceFile(scenario: ScenarioDefinition, file: string): string {
  if (scenario.kind === 'app') return join(APP_DIRECTORY, file);
  return join(scenarioDirectory(scenario.id), 'solution', 'files', file);
}

export function brokenFile(scenario: ScenarioDefinition, file: string): string {
  return join(scenarioDirectory(scenario.id), 'broken', file);
}

async function copyBase(scenario: ScenarioDefinition, workspace: string): Promise<void> {
  if (scenario.kind !== 'app') return;
  for (const folder of APP_FOLDERS) {
    await cp(join(APP_DIRECTORY, folder), join(workspace, folder), { recursive: true });
  }
}

async function copyAutomationStarter(scenario: ScenarioDefinition, workspace: string): Promise<void> {
  const starter = join(scenarioDirectory(scenario.id), 'automation', 'starter');
  if (!existsSync(starter)) return;
  await cp(starter, join(workspace, 'automation'), { recursive: true });
}

async function workspaceReadme(scenario: ScenarioDefinition): Promise<string> {
  const brief = await readFile(join(scenarioDirectory(scenario.id), 'brief.md'), 'utf8');
  const where =
    scenario.kind === 'app'
      ? 'This folder is your copy of the store (`src/`, `public/`). Edit it freely; `npm run lab -- start` restarts the store from here.'
      : 'This folder holds the workflow under investigation (`workflow.yml`). Edit it here, verify locally, then install it on a branch of your fork.';
  return [
    brief.trim(),
    '',
    '## Where to work',
    '',
    where,
    'It is a small git repository, so `git diff` shows your changes.',
    '',
    '## Commands (run them from the repository root)',
    '',
    '```bash',
    `npm run lab -- reproduce ${scenario.id}`,
    `npm run lab -- hint ${scenario.id}`,
    `npm run lab -- verify ${scenario.id}`,
    `npm run lab -- reset ${scenario.id}`,
    `npm run lab -- stop ${scenario.id}`,
    '```',
    '',
  ].join('\n');
}

function lines(output: string): string[] {
  return output.split('\n').map((line) => line.trim()).filter(Boolean);
}
