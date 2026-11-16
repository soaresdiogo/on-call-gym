import { isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { LabConfigurationError } from './errors.js';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const APP_DIRECTORY = join(REPO_ROOT, 'app');
export const SCENARIOS_DIRECTORY = join(REPO_ROOT, 'scenarios');

/**
 * Lab state must live inside the repository: workspaces import `fastify` and friends
 * from the repository's node_modules, and `reset`/`stop` must never reach outside it.
 */
export function stateRoot(): string {
  const configured = resolve(process.env.GYM_STATE_DIR ?? join(REPO_ROOT, '.gym'));
  const inside = relative(REPO_ROOT, configured);
  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new LabConfigurationError(`GYM_STATE_DIR must be a folder inside ${REPO_ROOT}`);
  }
  return configured;
}

/** Every file the lab creates for one scenario attempt. */
export class AttemptPaths {
  readonly attempt: string;

  constructor(readonly scenarioId: string, root: string = stateRoot()) {
    this.attempt = join(root, 'attempts', scenarioId);
  }

  get workspace(): string {
    return join(this.attempt, 'workspace');
  }

  get runtime(): string {
    return join(this.attempt, 'runtime');
  }

  get stackFile(): string {
    return join(this.runtime, 'stack.json');
  }

  get storeLog(): string {
    return join(this.runtime, 'store.log');
  }

  get stackOutput(): string {
    return join(this.runtime, 'stack-output.log');
  }

  get database(): string {
    return join(this.runtime, 'pgdata');
  }

  get hintProgress(): string {
    return join(this.runtime, 'hints.json');
  }
}

export function scenarioDirectory(scenarioId: string): string {
  return join(SCENARIOS_DIRECTORY, scenarioId);
}
