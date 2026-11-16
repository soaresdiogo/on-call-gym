import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'yaml';
import { InfrastructureError } from '../core/errors.js';

/**
 * A deliberately small GitHub Actions interpreter for the challenges. It reproduces the
 * rules that decide a check's colour (default shell flags, continue-on-error, if:)
 * and refuses anything it does not model, so a local pass is never a guess.
 */

const STEP_TIMEOUT_MS = 5 * 60_000;
// The checkout already has node_modules; reinstalling locally would only be slow.
const SETUP_COMMANDS = new Set(['npm ci', 'npm install']);
const EXPRESSION = /\$\{\{/;
const STATUS_FUNCTIONS = new Map<string, (failed: boolean) => boolean>([
  ['success()', (failed) => !failed],
  ['failure()', (failed) => failed],
  ['always()', () => true],
  ['!cancelled()', () => true],
  ['cancelled()', () => false],
]);

export type Conclusion = 'success' | 'failure';

export interface StepRun {
  readonly name: string;
  readonly outcome: Conclusion | 'skipped';
  readonly conclusion: Conclusion | 'skipped';
}

export interface WorkflowRun {
  readonly conclusion: Conclusion;
  readonly steps: readonly StepRun[];
  readonly log: string;
}

interface StepDefinition {
  name?: string;
  run?: string;
  uses?: string;
  shell?: string;
  env?: Record<string, string>;
  if?: string;
  'continue-on-error'?: boolean;
  'working-directory'?: string;
}

interface JobDefinition {
  steps?: StepDefinition[];
  env?: Record<string, string>;
  defaults?: { run?: { shell?: string } };
  'continue-on-error'?: unknown;
  services?: unknown;
  strategy?: unknown;
  container?: unknown;
}

interface WorkflowDefinition {
  env?: Record<string, string>;
  defaults?: { run?: { shell?: string } };
  jobs?: Record<string, JobDefinition>;
}

export class UnsupportedWorkflowError extends InfrastructureError {}

export interface LocalRunOptions {
  readonly workflowFile: string;
  readonly cwd: string;
  /** Variables the lab forces, such as the canary fixture; they win over the workflow's env. */
  readonly overrides: Record<string, string>;
}

export async function runWorkflowLocally(options: LocalRunOptions): Promise<WorkflowRun> {
  const workflow = await loadWorkflow(options.workflowFile);
  const steps: StepRun[] = [];
  const log: string[] = [];
  let failed = false;
  for (const [jobId, job] of Object.entries(workflow.jobs ?? {})) {
    assertSupportedJob(jobId, job);
    for (const step of job.steps ?? []) {
      const result = await runStep(step, { workflow, job, options, failed, log });
      steps.push(result);
      failed = failed || result.conclusion === 'failure';
    }
  }
  return { conclusion: failed ? 'failure' : 'success', steps, log: log.join('\n') };
}

async function loadWorkflow(file: string): Promise<WorkflowDefinition> {
  const workflow = parse(await readFile(file, 'utf8')) as WorkflowDefinition | null;
  if (!workflow?.jobs || Object.keys(workflow.jobs).length === 0) {
    throw new UnsupportedWorkflowError(`${file} has no jobs.`);
  }
  return workflow;
}

function assertSupportedJob(jobId: string, job: JobDefinition): void {
  for (const key of ['continue-on-error', 'services', 'strategy', 'container'] as const) {
    if (job[key] !== undefined) {
      throw new UnsupportedWorkflowError(`Job "${jobId}" uses "${key}", which the local runner does not model. Validate it on GitHub.`);
    }
  }
}

interface StepContext {
  readonly workflow: WorkflowDefinition;
  readonly job: JobDefinition;
  readonly options: LocalRunOptions;
  readonly failed: boolean;
  readonly log: string[];
}

async function runStep(step: StepDefinition, context: StepContext): Promise<StepRun> {
  const name = step.name ?? step.run?.split('\n')[0] ?? step.uses ?? 'step';
  context.log.push(`##[step] ${name}`);
  if (!shouldRun(step.if, context.failed) || !step.run || SETUP_COMMANDS.has(step.run.trim())) {
    context.log.push(`##[skipped] ${step.run ? 'condition false or setup step provided by the local checkout' : `uses: ${step.uses}`}`);
    return { name, outcome: 'skipped', conclusion: 'skipped' };
  }
  const outcome = await execute(step, context);
  const conclusion = outcome === 'failure' && step['continue-on-error'] === true ? 'success' : outcome;
  context.log.push(`##[result] outcome=${outcome} conclusion=${conclusion}`);
  return { name, outcome, conclusion };
}

function shouldRun(condition: string | undefined, failed: boolean): boolean {
  const expression = (condition ?? 'success()').replace(/^\$\{\{\s*|\s*\}\}$/g, '').trim();
  const evaluate = STATUS_FUNCTIONS.get(expression);
  if (!evaluate) throw new UnsupportedWorkflowError(`The local runner only understands status functions in if:, got "${condition}".`);
  return evaluate(failed);
}

async function execute(step: StepDefinition, context: StepContext): Promise<Conclusion> {
  const script = step.run ?? '';
  const env = { ...context.workflow.env, ...context.job.env, ...step.env };
  if (EXPRESSION.test(script) || Object.values(env).some((value) => EXPRESSION.test(String(value)))) {
    throw new UnsupportedWorkflowError('Expressions (${{ }}) in run: or env: are not modelled locally. Validate on GitHub.');
  }
  const shell = step.shell ?? context.job.defaults?.run?.shell ?? context.workflow.defaults?.run?.shell;
  const directory = await mkdtemp(join(tmpdir(), 'gym-step-'));
  try {
    const file = join(directory, 'step.sh');
    await writeFile(file, script);
    const [command, ...args] = shellCommand(shell, file);
    const cwd = step['working-directory'] ? join(context.options.cwd, step['working-directory']) : context.options.cwd;
    const exitCode = await spawnAndLog(command ?? 'bash', args, { cwd, env: { ...process.env, CI: 'true', ...env, ...context.options.overrides } }, context.log);
    return exitCode === 0 ? 'success' : 'failure';
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

/** The same commands GitHub runs on Linux runners for each `shell:` value. */
function shellCommand(shell: string | undefined, file: string): string[] {
  if (shell === undefined) return ['bash', '-e', file];
  if (shell === 'bash') return ['bash', '--noprofile', '--norc', '-eo', 'pipefail', file];
  if (shell === 'sh') return ['sh', '-e', file];
  if (shell.includes('{0}')) return shell.split(/\s+/).map((part) => part.replace('{0}', file));
  throw new UnsupportedWorkflowError(`shell: ${shell} is not modelled locally.`);
}

function spawnAndLog(command: string, args: string[], options: { cwd: string; env: NodeJS.ProcessEnv }, log: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn(command, args, { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    const timer = setTimeout(() => child.kill('SIGKILL'), STEP_TIMEOUT_MS);
    child.stdout.on('data', (chunk: Buffer) => log.push(chunk.toString()));
    child.stderr.on('data', (chunk: Buffer) => log.push(chunk.toString()));
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve(code ?? 1);
    });
    child.on('error', () => resolve(127));
  });
}
