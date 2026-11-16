import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { appendFile, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { afterAll, describe, expect, it } from 'vitest';
import { REPO_ROOT } from '../core/paths.js';

// Own state folder and ports, so the test never touches a learner's attempts or a running demo.
const STATE_DIR = join(REPO_ROOT, '.gym', `cli-test-${randomUUID()}`);
const PORT_BASE = 4300 + Math.floor(Math.random() * 500);
const ENVIRONMENT = {
  ...process.env,
  GYM_STATE_DIR: STATE_DIR,
  GYM_STORE_PORT: String(PORT_BASE),
  GYM_PROVIDER_PORT: String(PORT_BASE + 1),
  GYM_CONTROL_PORT: String(PORT_BASE + 2),
  GYM_EXPORT_DIR: join(STATE_DIR, 'exports'),
  NO_COLOR: '1',
};
const WORKSPACE = join(STATE_DIR, 'attempts', 'retry-storm', 'workspace');

async function lab(...args: string[]): Promise<{ code: number; output: string }> {
  try {
    const { stdout, stderr } = await promisify(execFile)(process.execPath, ['--import', 'tsx', 'lab/cli.ts', ...args], {
      cwd: REPO_ROOT,
      env: ENVIRONMENT,
    });
    return { code: 0, output: stdout + stderr };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return { code: failure.code ?? -1, output: (failure.stdout ?? '') + (failure.stderr ?? '') };
  }
}

afterAll(async () => {
  await lab('stop', 'retry-storm');
  await rm(STATE_DIR, { recursive: true, force: true });
});

describe('documented CLI flow (README quickstart)', () => {
  it('lists every scenario with its level', async () => {
    const result = await lab('list');

    expect(result.code).toBe(0);
    for (const id of ['retry-storm', 'false-green', 'order-not-found', 'double-submit', 'duplicate-webhook', 'oversold-inventory']) {
      expect(result.output).toContain(id);
    }
  });

  it('starts, verifies, fixes, resets and stops retry-storm with the documented exit codes', async () => {
    const started = await lab('start', 'retry-storm');
    expect(started.code, started.output).toBe(0);
    expect(started.output).toContain('ALERT');
    expect(started.output).toContain(`http://127.0.0.1:${PORT_BASE}/dashboard`);

    const before = await lab('verify', 'retry-storm');
    expect(before.code, before.output).toBe(1);
    expect(before.output).toContain('STILL FAILING');

    expect((await lab('solution', 'retry-storm', '--apply', '--yes')).code).toBe(0);
    const after = await lab('verify', 'retry-storm');
    expect(after.code, after.output).toBe(0);
    expect(after.output).toContain('RECOVERED');

    const exported = await lab('export', 'retry-storm');
    expect(exported.code, exported.output).toBe(0);
    const exportDirectory = join(STATE_DIR, 'exports', 'retry-storm');
    expect(await readFile(join(exportDirectory, 'README.md'), 'utf8')).toContain('**Verdict:** RECOVERED');
    expect(await readFile(join(exportDirectory, 'fix.diff'), 'utf8')).toContain('+function backoffDelay');
    expect(JSON.parse(await readFile(join(exportDirectory, 'verification.json'), 'utf8')).verdict).toBe('recovered');
    // The learner's own post-mortem survives a second export, and their git index is left alone.
    await writeFile(join(exportDirectory, 'POSTMORTEM.md'), 'My own words');
    expect((await lab('export', 'retry-storm')).code).toBe(0);
    expect(await readFile(join(exportDirectory, 'POSTMORTEM.md'), 'utf8')).toBe('My own words');
    const { stdout: status } = await promisify(execFile)('git', ['status', '--porcelain'], { cwd: WORKSPACE });
    expect(status).toContain(' M src/infrastructure/http-payment-gateway.ts');

    // No terminal and no --yes: reset must refuse and keep the learner's change.
    const refused = await lab('reset', 'retry-storm');
    expect(refused.code).toBe(2);
    expect(await readFile(join(WORKSPACE, 'src/infrastructure/http-payment-gateway.ts'), 'utf8')).toContain('backoffDelay');

    const reset = await lab('reset', 'retry-storm', '--yes');
    expect(reset.code, reset.output).toBe(0);
    expect(await readFile(join(WORKSPACE, 'src/infrastructure/http-payment-gateway.ts'), 'utf8')).not.toContain('backoffDelay');

    expect((await lab('stop', 'retry-storm')).output).toMatch(/Nothing is running|Stopped/);
  });

  it('reports "not verified" (exit 2), not a failure, when the store cannot even load', async () => {
    await lab('reset', 'retry-storm', '--yes');
    await appendFile(join(WORKSPACE, 'src/store.ts'), '\nthis is not typescript(\n');

    const result = await lab('verify', 'retry-storm');

    expect(result.code).toBe(2);
    expect(result.output).toContain('NOT VERIFIED');
  });

  it('rejects unknown scenarios and attempts that were never started with exit 2', async () => {
    expect((await lab('verify', 'no-such-scenario')).code).toBe(2);
    expect((await lab('verify', 'order-not-found')).code).toBe(2);
  });
});
