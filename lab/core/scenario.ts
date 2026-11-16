import type { CheckResult } from './checks.js';

export type Level = 'junior' | 'mid' | 'senior';
export type ScenarioKind = 'app' | 'actions';

export interface Reading {
  readonly title: string;
  readonly url: string;
}

export interface VerifyContext {
  readonly workspace: string;
}

export interface StackContext {
  readonly storeUrl: string;
  readonly providerUrl: string;
  readonly webhookSecret: string;
  /** Lab-only control endpoint of the running stack (re-runs the scenario's data setup). */
  readonly controlUrl: string;
}

export interface AutomationDefinition {
  /** Path of the learner's automation inside the workspace. */
  readonly entry: string;
  readonly summary: string;
  evaluate(context: VerifyContext): Promise<CheckResult[]>;
}

export interface ScenarioDefinition {
  readonly id: string;
  readonly title: string;
  readonly level: Level;
  readonly kind: ScenarioKind;
  readonly prerequisites: readonly string[];
  readonly objective: string;
  readonly readings: readonly Reading[];
  /** Check ids the broken version must fail; the official CI asserts it fails for this reason. */
  readonly expectedFailures: readonly string[];
  verify(context: VerifyContext): Promise<CheckResult[]>;
  /** Shows the symptom against the running stack (app scenarios) or the local runner (Actions). */
  reproduce(context: StackContext & VerifyContext): Promise<void>;
  /** SQL run once when the attempt's database is created. */
  readonly stackSetup?: readonly string[];
  readonly automation?: AutomationDefinition;
}
