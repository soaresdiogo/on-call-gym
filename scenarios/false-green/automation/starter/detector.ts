/**
 * Your automation for false-green.
 *
 * Write a detector that receives a finished CI run and says whether its colour lies:
 * a green job that hides failing (or missing) tests. `npm run lab -- automate false-green`
 * runs real local workflow runs through it: the original faulty workflow, a variant that
 * hides failures by a different mechanism, and fixed workflows that must not be flagged.
 *
 * A detector that only looks for one line in the YAML will not be enough.
 * Use any tool you like, AI included. Keep the exported names and types.
 */

export interface CompletedRun {
  /** The workflow file that ran. */
  readonly workflow: string;
  /** The job's final colour. */
  readonly conclusion: 'success' | 'failure';
  /** Everything the steps printed. */
  readonly log: string;
  /** Vitest's JSON report summary, or null when no report was written. */
  readonly testReport: { total: number; failed: number } | null;
}

export interface Detection {
  readonly alert: boolean;
  readonly reason: string;
}

export function detectFalseGreen(run: CompletedRun): Detection {
  return { alert: false, reason: `not implemented yet (conclusion ${run.conclusion})` };
}
