import { findScenario } from '../core/catalog.js';
import { UsageError } from '../core/errors.js';
import { heading, print, style } from '../core/console-output.js';
import { hintsSeen, loadHints, recordHintSeen } from '../core/hints.js';
import { AttemptPaths } from '../core/paths.js';

export async function hintCommand(scenarioId: string | undefined, requested: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const paths = new AttemptPaths(scenario.id);
  const hints = await loadHints(scenario.id);
  const number = requested ? Number(requested) : Math.min(hints.length, (await hintsSeen(paths.hintProgress)) + 1);
  const hint = hints[number - 1];
  if (!Number.isInteger(number) || !hint) throw new UsageError(`Hints for ${scenario.id} go from 1 to ${hints.length}.`);

  heading(`Hint ${number} of ${hints.length} for ${scenario.id}`);
  print(hint);
  await recordHintSeen(paths.hintProgress, number);
  if (number === hints.length) printReadings(scenario.readings);
  return 0;
}

function printReadings(readings: readonly { title: string; url: string }[]): void {
  heading('Further reading');
  for (const reading of readings) print(`  ${reading.title}\n  ${style.cyan(reading.url)}`);
}
