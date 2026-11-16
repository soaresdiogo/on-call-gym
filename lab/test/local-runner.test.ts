import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { runWorkflowLocally, UnsupportedWorkflowError } from '../actions/local-runner.js';
import { stateRoot } from '../core/paths.js';

let directory: string;

beforeAll(async () => {
  directory = await mkdtemp(join(stateRoot(), 'runner-test-'));
});

afterAll(async () => {
  await rm(directory, { recursive: true, force: true });
});

async function run(steps: string): Promise<Awaited<ReturnType<typeof runWorkflowLocally>>> {
  const file = join(directory, `${Math.random().toString(36).slice(2)}.yml`);
  await writeFile(file, `name: t\non: push\njobs:\n  test:\n    runs-on: ubuntu-24.04\n    steps:\n${steps}`);
  return runWorkflowLocally({ workflowFile: file, cwd: directory, overrides: {} });
}

describe('local GitHub Actions runner', () => {
  it('uses bash -e without pipefail when no shell is given, like GitHub', async () => {
    const result = await run('      - run: false | cat\n');

    expect(result.conclusion).toBe('success');
  });

  it('uses pipefail for an explicit shell: bash', async () => {
    const result = await run('      - shell: bash\n        run: false | cat\n');

    expect(result.conclusion).toBe('failure');
  });

  it('keeps the job green when a failing step has continue-on-error', async () => {
    const result = await run('      - run: exit 1\n        continue-on-error: true\n');

    expect(result.steps[0]).toMatchObject({ outcome: 'failure', conclusion: 'success' });
    expect(result.conclusion).toBe('success');
  });

  it('skips later steps after a failure unless they use always()', async () => {
    const result = await run('      - run: exit 1\n      - run: echo skipped\n      - if: always()\n        run: echo ran\n');

    expect(result.steps.map((step) => step.outcome)).toEqual(['failure', 'skipped', 'success']);
  });

  it('refuses expressions it cannot evaluate instead of guessing', async () => {
    await expect(run('      - run: echo ${{ github.sha }}\n')).rejects.toBeInstanceOf(UnsupportedWorkflowError);
  });
});
