import { createInterface } from 'node:readline/promises';
import { UsageError } from './errors.js';

/** Asks before destroying learner work; without a terminal it refuses unless --yes was given. */
export async function confirm(question: string, assumeYes: boolean): Promise<boolean> {
  if (assumeYes) return true;
  if (!process.stdin.isTTY) {
    throw new UsageError(`${question}\nNo terminal to confirm in. Re-run with --yes to proceed.`);
  }
  const prompt = createInterface({ input: process.stdin, output: process.stdout });
  try {
    const answer = await prompt.question(`${question} Type "yes" to continue: `);
    return answer.trim().toLowerCase() === 'yes';
  } finally {
    prompt.close();
  }
}
