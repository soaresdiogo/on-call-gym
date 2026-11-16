import { describe, expect, it } from 'vitest';
import { allScenarios } from '../core/catalog.js';
import { withScratchVersion } from '../core/scratch.js';
import { verifyScenario } from '../core/verification.js';

/**
 * The official guarantee behind every exercise: the broken version fails for the
 * documented reason, and the reference solution recovers without breaking anything.
 */
describe.each(allScenarios().map((scenario) => [scenario.id, scenario] as const))('%s', (_id, scenario) => {
  it('fails before the fix, for the expected reasons', async () => {
    // Act
    const report = await withScratchVersion(scenario, 'broken', (workspace) => verifyScenario(scenario, { workspace }));

    // Assert
    expect(report.verdict, report.problem).toBe('still_failing');
    const failed = report.checks.filter((result) => !result.passed).map((result) => result.id);
    expect(failed).toEqual(expect.arrayContaining([...scenario.expectedFailures]));
  });

  it('recovers with the reference solution', async () => {
    // Act
    const report = await withScratchVersion(scenario, 'reference', (workspace) => verifyScenario(scenario, { workspace }));

    // Assert
    const failed = report.checks.filter((result) => !result.passed).map((result) => `${result.id}: ${result.detail}`);
    expect(failed).toEqual([]);
    expect(report.verdict, report.problem).toBe('recovered');
  });
});
