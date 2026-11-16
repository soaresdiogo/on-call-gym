import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { check, type CheckResult } from '../../lab/core/checks.js';
import { InfrastructureError } from '../../lab/core/errors.js';
import type { ScenarioDefinition, VerifyContext } from '../../lab/core/scenario.js';
import { withScratchVersion } from '../../lab/core/scratch.js';
import { withHarness } from '../../lab/core/store-harness.js';
import type { CodeVersion } from '../../lab/core/workspace.js';
import type { ProviderBehavior } from '../../lab/simulators/payment-provider.js';
import type { TrafficSample } from '../../lab/core/traffic-monitor.js';
import { BURSTY_PROVIDER, recordTraffic, SLOW_PROVIDER } from './traffic.js';

export const AUTOMATION_ENTRY = 'automation/detector.ts';
const RECORDING_MS = 4_000;
const DRAIN_TIMEOUT_MS = 6_000;

interface Detector {
  detectRetryStorm(samples: readonly TrafficSample[]): { alert: boolean; reason: string };
}

interface Case {
  readonly id: string;
  readonly label: string;
  readonly version: CodeVersion;
  readonly behavior: Partial<ProviderBehavior>;
  readonly shouldAlert: boolean;
}

const CASES: readonly Case[] = [
  { id: 'alerts-original-storm', label: 'original incident, faulty store', version: 'broken', behavior: SLOW_PROVIDER, shouldAlert: true },
  { id: 'quiet-original-healthy', label: 'original incident, fixed store', version: 'reference', behavior: SLOW_PROVIDER, shouldAlert: false },
  { id: 'alerts-variant-storm', label: 'variant (bursty provider), faulty store', version: 'broken', behavior: BURSTY_PROVIDER, shouldAlert: true },
  { id: 'quiet-variant-healthy', label: 'variant (bursty provider), fixed store', version: 'reference', behavior: BURSTY_PROVIDER, shouldAlert: false },
];

/** Runs the learner's detector on four live recordings and checks each verdict. */
export async function evaluateRetryStormAutomation(scenario: ScenarioDefinition, context: VerifyContext): Promise<CheckResult[]> {
  const detector = await loadDetector(context.workspace);
  const results: CheckResult[] = [];
  for (const testCase of CASES) {
    const samples = await withScratchVersion(scenario, testCase.version, (directory) => record(directory, testCase.behavior));
    const detection = detector.detectRetryStorm(samples);
    const expected = testCase.shouldAlert ? 'alert' : 'stay quiet';
    results.push(
      check(testCase.id, testCase.shouldAlert ? 'recovery' : 'regression', `Detector should ${expected}: ${testCase.label}`).passWhen(
        detection.alert === testCase.shouldAlert,
        `detector said alert=${detection.alert} (${detection.reason})`,
      ),
    );
  }
  return results;
}

async function record(directory: string, behavior: Partial<ProviderBehavior>): Promise<TrafficSample[]> {
  return withHarness(directory, { behavior }, async (harness) => {
    const recording = await recordTraffic(harness, RECORDING_MS);
    await harness.provider.waitUntilIdle(DRAIN_TIMEOUT_MS);
    return recording.samples;
  });
}

async function loadDetector(workspace: string): Promise<Detector> {
  try {
    const module = (await import(pathToFileURL(join(workspace, AUTOMATION_ENTRY)).href)) as Partial<Detector>;
    if (typeof module.detectRetryStorm !== 'function') throw new Error('detectRetryStorm is not exported');
    return module as Detector;
  } catch (error) {
    throw new InfrastructureError(`Could not load ${AUTOMATION_ENTRY}: ${error instanceof Error ? error.message : String(error)}`);
  }
}
