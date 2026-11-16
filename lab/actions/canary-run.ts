import { existsSync } from 'node:fs';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { REPO_ROOT, stateRoot } from '../core/paths.js';
import { runWorkflowLocally, type WorkflowRun } from './local-runner.js';

export type CanaryMode = 'failing' | 'healthy';

/** The canary fixture of app/test/ci-canary.test.ts with a right or a wrong expected total. */
const FIXTURES: Record<CanaryMode, object> = {
  healthy: { cart: [{ unitPriceCents: 1299, quantity: 2 }], expectedTotalCents: 2598 },
  failing: { cart: [{ unitPriceCents: 1299, quantity: 2 }], expectedTotalCents: 2599 },
};

export interface TestReport {
  readonly total: number;
  readonly failed: number;
}

export interface CanaryRun extends WorkflowRun {
  /** Did the canary test really run, whatever the job colour says. */
  readonly canaryRan: boolean;
  readonly testReport: TestReport | null;
}

/** Runs a workflow locally with a controlled canary fixture and collects proof that tests ran. */
export async function runWithCanary(workflowFile: string, mode: CanaryMode): Promise<CanaryRun> {
  const directory = await mkdtemp(join(stateRoot(), 'canary-'));
  const files = { fixture: join(directory, 'fixture.json'), marker: join(directory, 'marker.txt'), report: join(directory, 'report.json') };
  try {
    await writeFile(files.fixture, JSON.stringify(FIXTURES[mode]));
    const run = await runWorkflowLocally({
      workflowFile,
      cwd: REPO_ROOT,
      overrides: { GYM_CANARY_FIXTURE: files.fixture, GYM_TEST_MARKER: files.marker, GYM_TEST_REPORT: files.report },
    });
    return { ...run, canaryRan: existsSync(files.marker), testReport: await readReport(files.report) };
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

async function readReport(file: string): Promise<TestReport | null> {
  if (!existsSync(file)) return null;
  const report = JSON.parse(await readFile(file, 'utf8')) as { numTotalTests?: number; numFailedTests?: number };
  return { total: report.numTotalTests ?? 0, failed: report.numFailedTests ?? 0 };
}
