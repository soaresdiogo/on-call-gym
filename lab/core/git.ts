import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { LabConfigurationError } from './errors.js';

const run = promisify(execFile);

// Fixed identity and no signing: the workspace repo is local scratch, not the learner's history.
const GIT_ENVIRONMENT = {
  GIT_AUTHOR_NAME: 'On-Call Gym',
  GIT_AUTHOR_EMAIL: 'lab@on-call-gym.invalid',
  GIT_COMMITTER_NAME: 'On-Call Gym',
  GIT_COMMITTER_EMAIL: 'lab@on-call-gym.invalid',
};

export async function git(cwd: string, args: readonly string[]): Promise<string> {
  try {
    const { stdout } = await run('git', ['-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], {
      cwd,
      env: { ...process.env, ...GIT_ENVIRONMENT },
    });
    return stdout;
  } catch (error) {
    throw new LabConfigurationError(`git ${args[0]} failed in ${cwd}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** `git diff --no-index` exits with 1 when files differ, which is the expected case here. */
export async function diffFiles(left: string, right: string, cwd: string): Promise<string> {
  try {
    await run('git', ['diff', '--no-index', '--no-color', left, right], { cwd });
    return '';
  } catch (error) {
    const output = (error as { stdout?: string }).stdout;
    if (typeof output === 'string') return output;
    throw new LabConfigurationError(`Could not diff ${left} and ${right}`);
  }
}
