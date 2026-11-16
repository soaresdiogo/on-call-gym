import type { CheckResult } from './checks.js';
import { InfrastructureError } from './errors.js';
import type { ScenarioDefinition, VerifyContext } from './scenario.js';

export type Verdict = 'recovered' | 'still_failing' | 'not_verified';

export const EXIT_CODES: Record<Verdict, number> = {
  recovered: 0,
  still_failing: 1,
  not_verified: 2,
};

const VERIFY_TIMEOUT_MS = 90_000;

export interface VerificationReport {
  readonly verdict: Verdict;
  readonly checks: readonly CheckResult[];
  readonly problem?: string;
}

export async function runChecks(
  run: (context: VerifyContext) => Promise<CheckResult[]>,
  context: VerifyContext,
): Promise<VerificationReport> {
  try {
    const checks = await withTimeout(run(context), VERIFY_TIMEOUT_MS);
    return judge(checks);
  } catch (error) {
    return { verdict: 'not_verified', checks: [], problem: describeProblem(error) };
  }
}

export function verifyScenario(scenario: ScenarioDefinition, context: VerifyContext): Promise<VerificationReport> {
  return runChecks((verifyContext) => scenario.verify(verifyContext), context);
}

/** An empty check list is never a pass: a verifier that checked nothing proved nothing. */
function judge(checks: readonly CheckResult[]): VerificationReport {
  if (checks.length === 0) {
    return { verdict: 'not_verified', checks, problem: 'The verifier ran no checks.' };
  }
  const verdict = checks.every((result) => result.passed) ? 'recovered' : 'still_failing';
  return { verdict, checks };
}

function describeProblem(error: unknown): string {
  if (error instanceof InfrastructureError) return error.message;
  if (error instanceof Error) return `The verifier crashed: ${error.message}`;
  return 'The verifier crashed with an unknown error.';
}

async function withTimeout<Value>(promise: Promise<Value>, milliseconds: number): Promise<Value> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new InfrastructureError(`Verification timed out after ${milliseconds / 1000} s.`)), milliseconds);
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
