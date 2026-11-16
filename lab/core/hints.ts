import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { scenarioDirectory } from './paths.js';

const HINT_HEADING = /^## Hint (\d+)\s*$/m;

/** Parses `## Hint N` sections from a scenario's hints.md. */
export async function loadHints(scenarioId: string): Promise<string[]> {
  const content = await readFile(join(scenarioDirectory(scenarioId), 'hints.md'), 'utf8');
  const sections = content.split(HINT_HEADING).slice(1);
  const hints: string[] = [];
  for (let index = 0; index < sections.length; index += 2) {
    hints.push((sections[index + 1] ?? '').trim());
  }
  return hints;
}

export async function hintsSeen(progressFile: string): Promise<number> {
  if (!existsSync(progressFile)) return 0;
  const progress = JSON.parse(await readFile(progressFile, 'utf8')) as { seen?: number };
  return progress.seen ?? 0;
}

export async function recordHintSeen(progressFile: string, number: number): Promise<void> {
  await mkdir(dirname(progressFile), { recursive: true });
  const seen = Math.max(number, await hintsSeen(progressFile));
  await writeFile(progressFile, JSON.stringify({ seen }));
}
