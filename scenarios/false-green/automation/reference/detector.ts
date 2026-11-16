/**
 * Reference automation for false-green: judge the run by its evidence, not by its YAML.
 * A green job must come with a test report that ran tests and had no failures.
 */

export interface CompletedRun {
  readonly workflow: string;
  readonly conclusion: 'success' | 'failure';
  readonly log: string;
  readonly testReport: { total: number; failed: number } | null;
}

export interface Detection {
  readonly alert: boolean;
  readonly reason: string;
}

export function detectFalseGreen(run: CompletedRun): Detection {
  if (run.conclusion === 'failure') return { alert: false, reason: 'a red run is honest' };
  if (!run.testReport || run.testReport.total === 0) return { alert: true, reason: 'green without any test evidence' };
  if (run.testReport.failed > 0) return { alert: true, reason: `green with ${run.testReport.failed} failed tests` };
  return { alert: false, reason: 'green and every test passed' };
}
