import { join } from 'node:path';
import { runWithCanary, type CanaryRun } from '../../lab/actions/canary-run.js';
import { check, type CheckResult } from '../../lab/core/checks.js';
import type { VerifyContext } from '../../lab/core/scenario.js';

export const WORKFLOW_FILE = 'workflow.yml';

/** Runs the learner's workflow twice: with a deliberately failing test and with the healthy fixture. */
export async function verifyFalseGreen(context: VerifyContext): Promise<CheckResult[]> {
  const workflow = join(context.workspace, WORKFLOW_FILE);
  const failing = await runWithCanary(workflow, 'failing');
  const healthy = await runWithCanary(workflow, 'healthy');
  return [
    check('red-on-failing-test', 'recovery', 'A failing test turns the job red').passWhen(
      failing.conclusion === 'failure',
      `job concluded "${failing.conclusion}" with a failing canary test`,
    ),
    check('tests-ran-when-failing', 'recovery', 'The tests actually ran in the failing case').passWhen(testsRan(failing), describeTests(failing)),
    check('green-on-healthy', 'regression', 'The same workflow is green with the healthy fixture').passWhen(
      healthy.conclusion === 'success',
      `job concluded "${healthy.conclusion}" with the healthy fixture`,
    ),
    check('tests-ran-when-healthy', 'regression', 'The tests actually ran in the healthy case').passWhen(
      testsRan(healthy) && healthy.testReport?.failed === 0,
      describeTests(healthy),
    ),
  ];
}

/** A green job without the canary in the report proves nothing, so both are required. */
function testsRan(run: CanaryRun): boolean {
  return run.canaryRan && (run.testReport?.total ?? 0) > 0;
}

function describeTests(run: CanaryRun): string {
  if (!run.testReport) return `no test report was produced (canary ran: ${run.canaryRan})`;
  return `${run.testReport.total} tests ran, ${run.testReport.failed} failed (canary ran: ${run.canaryRan})`;
}
