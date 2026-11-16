import { relative } from 'node:path';
import { exportAttempt } from '../core/attempt-export.js';
import { findScenario } from '../core/catalog.js';
import { print, style } from '../core/console-output.js';
import { REPO_ROOT } from '../core/paths.js';
import { printReport } from '../core/report.js';
import { EXIT_CODES, verifyScenario } from '../core/verification.js';
import { requireWorkspace } from './verify.js';

/** Verifies the attempt, then saves it to my-incidents/<id>/ for the learner's portfolio. */
export async function exportCommand(scenarioId: string | undefined): Promise<number> {
  const scenario = findScenario(scenarioId);
  const workspace = requireWorkspace(scenario);
  const report = await verifyScenario(scenario, { workspace });
  printReport(`Verifying ${scenario.id} before exporting`, report);

  const result = await exportAttempt(scenario, workspace, report);
  const directory = relative(REPO_ROOT, result.directory);
  print();
  print(style.green(`Exported to ${directory}/ (${result.changedFiles} changed file(s) in fix.diff).`));
  if (result.createdPostmortem) print(`Write your post-mortem in ${directory}/POSTMORTEM.md; later exports keep it.`);
  if (report.verdict !== 'recovered') print(style.yellow('The export records that this attempt is not recovered yet.'));
  print(style.dim(`Commit it on your fork: git add ${directory} && git commit -m "Solve ${scenario.id}"`));
  return EXIT_CODES[report.verdict];
}
