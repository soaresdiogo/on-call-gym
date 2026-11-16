import { execFile, spawn } from 'node:child_process';
import { existsSync, openSync } from 'node:fs';
import { mkdir, readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { setTimeout as sleep } from 'node:timers/promises';
import { promisify } from 'node:util';
import { InfrastructureError } from './errors.js';
import { AttemptPaths, REPO_ROOT, stateRoot } from './paths.js';

const STACK_ENTRY = join(REPO_ROOT, 'lab', 'runtime', 'stack.ts');
const STACK_MARKER = 'lab/runtime/stack.ts';
const READY_TIMEOUT_MS = 30_000;
const POLL_INTERVAL_MS = 250;
const STOP_TIMEOUT_MS = 5_000;

export interface StackInfo {
  readonly pid: number;
  readonly scenarioId: string;
  readonly storeUrl: string;
  readonly providerUrl: string;
  readonly controlUrl: string;
}

export async function readStack(paths: AttemptPaths): Promise<StackInfo | null> {
  if (!existsSync(paths.stackFile)) return null;
  const info = JSON.parse(await readFile(paths.stackFile, 'utf8')) as StackInfo;
  if (await isLabStack(info.pid)) return info;
  await rm(paths.stackFile, { force: true });
  return null;
}

/** Starts the store and the payment simulator in the background and waits until the store is ready. */
export async function startStack(paths: AttemptPaths): Promise<StackInfo> {
  await mkdir(paths.runtime, { recursive: true });
  await rm(paths.stackFile, { force: true });
  const output = openSync(paths.stackOutput, 'w');
  const child = spawn(process.execPath, ['--import', 'tsx', STACK_ENTRY, paths.scenarioId], {
    cwd: REPO_ROOT,
    detached: true,
    stdio: ['ignore', output, output],
    env: process.env,
  });
  child.unref();
  return waitUntilReady(paths);
}

export async function stopStack(paths: AttemptPaths): Promise<boolean> {
  const info = await readStack(paths);
  if (!info) return false;
  process.kill(info.pid, 'SIGTERM');
  await waitForExit(info.pid);
  await rm(paths.stackFile, { force: true });
  return true;
}

/** Only one stack can own the lab ports, so starting a scenario stops the others. */
export async function stopOtherStacks(scenarioId: string): Promise<string[]> {
  const attemptsDirectory = join(stateRoot(), 'attempts');
  if (!existsSync(attemptsDirectory)) return [];
  const stopped: string[] = [];
  for (const id of await readdir(attemptsDirectory)) {
    if (id !== scenarioId && (await stopStack(new AttemptPaths(id)))) stopped.push(id);
  }
  return stopped;
}

async function waitUntilReady(paths: AttemptPaths): Promise<StackInfo> {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  while (Date.now() < deadline) {
    const info = existsSync(paths.stackFile) ? await readStack(paths) : null;
    if (info && (await isReady(info.storeUrl))) return info;
    await sleep(POLL_INTERVAL_MS);
  }
  const output = existsSync(paths.stackOutput) ? await readFile(paths.stackOutput, 'utf8') : '';
  throw new InfrastructureError(`The store did not become ready in ${READY_TIMEOUT_MS / 1000} s.\n${output.slice(-2_000)}`);
}

async function isReady(storeUrl: string): Promise<boolean> {
  try {
    const response = await fetch(`${storeUrl}/health/ready`, { signal: AbortSignal.timeout(1_000) });
    return response.ok;
  } catch {
    return false;
  }
}

/** Never signal a pid unless it is still one of our stack processes; pids get reused. */
async function isLabStack(pid: number): Promise<boolean> {
  try {
    const { stdout } = await promisify(execFile)('ps', ['-p', String(pid), '-o', 'command=']);
    return stdout.includes(STACK_MARKER);
  } catch {
    return false;
  }
}

async function waitForExit(pid: number): Promise<void> {
  const deadline = Date.now() + STOP_TIMEOUT_MS;
  while (Date.now() < deadline && (await isLabStack(pid))) {
    await sleep(POLL_INTERVAL_MS);
  }
  if (await isLabStack(pid)) process.kill(pid, 'SIGKILL');
}
