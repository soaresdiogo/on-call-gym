import { execFile } from 'node:child_process';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { allScenarios } from '../core/catalog.js';
import { REPO_ROOT } from '../core/paths.js';
import { withScratchVersion } from '../core/scratch.js';

const TYPESCRIPT = join(REPO_ROOT, 'node_modules', '.bin', 'tsc');

/** Broken overlays are excluded from the root typecheck, so each materialised workspace is checked here. */
describe('materialised workspaces typecheck', () => {
  it.each(allScenarios().filter((scenario) => scenario.kind === 'app').map((scenario) => [scenario.id, scenario] as const))(
    '%s (broken version)',
    async (_id, scenario) => {
      await withScratchVersion(scenario, 'broken', async (workspace) => {
        await writeFile(
          join(workspace, 'tsconfig.json'),
          JSON.stringify({ extends: join(REPO_ROOT, 'tsconfig.json'), include: ['src/**/*.ts'], exclude: [] }),
        );
        const result = await promisify(execFile)(TYPESCRIPT, ['--noEmit', '-p', workspace]).then(
          () => '',
          (error: { stdout?: string }) => error.stdout ?? 'tsc failed',
        );
        expect(result).toBe('');
      });
    },
  );
});
