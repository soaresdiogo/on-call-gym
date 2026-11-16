import { randomUUID } from 'node:crypto';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { stateRoot } from './paths.js';
import type { ScenarioDefinition } from './scenario.js';
import { materializeVersion, type CodeVersion } from './workspace.js';

/** Runs `work` on a temporary copy of the broken or reference code, inside the repo so imports resolve. */
export async function withScratchVersion<Result>(
  scenario: ScenarioDefinition,
  version: CodeVersion,
  work: (directory: string) => Promise<Result>,
): Promise<Result> {
  const directory = join(stateRoot(), 'scratch', `${scenario.id}-${version}-${randomUUID()}`);
  await mkdir(directory, { recursive: true });
  try {
    await materializeVersion(scenario, directory, version);
    return await work(directory);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}
