import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { runWithCanary, type CanaryMode } from '../../lab/actions/canary-run.js';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { InfrastructureError } from '../../lab/core/errors.js';
import { scenarioDirectory } from '../../lab/core/paths.js';
import type { VerifyContext } from '../../lab/core/scenario.js';

export const AUTOMATION_ENTRY = 'automation/detector.ts';

interface CompletedRun {
  workflow: string;
  conclusion: 'success' | 'failure';
  log: string;
  testReport: { total: number; failed: number } | null;
}

interface Detector {
  detectFalseGreen(run: CompletedRun): { alert: boolean; reason: string };
}

const WORKFLOWS = {
  original: join('broken', 'workflow.yml'),
  variant: join('variant', 'workflow.yml'),
  fixed: join('solution', 'files', 'workflow.yml'),
} as const;

const CASES: readonly { id: string; workflow: keyof typeof WORKFLOWS; canary: CanaryMode; shouldAlert: boolean; label: string }[] = [
  { id: 'alerts-original', workflow: 'original', canary: 'failing', shouldAlert: true, label: 'original workflow, failing test' },
  { id: 'alerts-variant', workflow: 'variant', canary: 'failing', shouldAlert: true, label: 'variant workflow, failing test' },
  { id: 'quiet-honest-red', workflow: 'fixed', canary: 'failing', shouldAlert: false, label: 'fixed workflow, failing test (honest red)' },
  { id: 'quiet-fixed-green', workflow: 'fixed', canary: 'healthy', shouldAlert: false, label: 'fixed workflow, healthy tests' },
  { id: 'quiet-variant-green', workflow: 'variant', canary: 'healthy', shouldAlert: false, label: 'variant workflow, healthy tests' },
];

export async function evaluateFalseGreenAutomation(context: VerifyContext): Promise<CheckResult[]> {
  const detector = await loadDetector(context.workspace);
  const results: CheckResult[] = [];
  for (const testCase of CASES) {
    const file = join(scenarioDirectory('false-green'), WORKFLOWS[testCase.workflow]);
    const run = await runWithCanary(file, testCase.canary);
    const detection = detector.detectFalseGreen({
      workflow: await readFile(file, 'utf8'),
      conclusion: run.conclusion,
      log: run.log,
      testReport: run.testReport,
    });
    results.push(
      check(testCase.id, testCase.shouldAlert ? 'recovery' : 'regression', `Detector should ${testCase.shouldAlert ? 'alert' : 'stay quiet'}: ${testCase.label}`).passWhen(
        detection.alert === testCase.shouldAlert,
        `job was ${run.conclusion}; detector said alert=${detection.alert} (${detection.reason})`,
      ),
    );
  }
  return results;
}

async function loadDetector(workspace: string): Promise<Detector> {
  try {
    const module = (await import(pathToFileURL(join(workspace, AUTOMATION_ENTRY)).href)) as Partial<Detector>;
    if (typeof module.detectFalseGreen !== 'function') throw new Error('detectFalseGreen is not exported');
    return module as Detector;
  } catch (error) {
    throw new InfrastructureError(`Could not load ${AUTOMATION_ENTRY}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
