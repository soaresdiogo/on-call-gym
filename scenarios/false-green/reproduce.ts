import { join } from 'node:path';
import { runWithCanary } from '../../lab/actions/canary-run.js';
import { heading, print, style } from '../../lab/core/console-output.js';
import type { VerifyContext } from '../../lab/core/scenario.js';
import { WORKFLOW_FILE } from './verify.js';

const LOG_TAIL_LINES = 25;

/** Runs the workflow locally with a failing test, like the pull request that triggered the report. */
export async function reproduceFalseGreen(context: VerifyContext): Promise<void> {
  print(style.dim('Running your workflow.yml with the local runner. The canary test is set to fail on purpose...'));
  const run = await runWithCanary(join(context.workspace, WORKFLOW_FILE), 'failing');
  heading('Steps');
  for (const step of run.steps) print(`  ${step.name.padEnd(40)} outcome=${step.outcome}  conclusion=${step.conclusion}`);
  heading('End of the log');
  print(style.dim(run.log.split('\n').slice(-LOG_TAIL_LINES).join('\n')));
  heading('Check colour');
  print(run.conclusion === 'success' ? style.green('success (green)') : style.red('failure (red)'));
  print(`Tests in the report: ${run.testReport?.total ?? 0}, failed: ${run.testReport?.failed ?? 0}`);
}
