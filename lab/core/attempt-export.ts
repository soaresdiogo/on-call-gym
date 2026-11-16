import { existsSync } from 'node:fs';
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { git } from './git.js';
import { exportRoot, REPO_ROOT, scenarioDirectory, stateRoot } from './paths.js';
import type { ScenarioDefinition } from './scenario.js';
import type { VerificationReport } from './verification.js';

const START_TAG = 'gym-start';

const VERDICT_LABEL: Record<VerificationReport['verdict'], string> = {
  recovered: 'RECOVERED',
  still_failing: 'STILL FAILING',
  not_verified: 'NOT VERIFIED',
};

export interface ExportResult {
  readonly directory: string;
  readonly changedFiles: number;
  readonly createdPostmortem: boolean;
}

/**
 * Writes a learner's attempt to my-incidents/<id>/ so it can be committed to their fork:
 * the diff of their changes, the verifier's verdict, and their own post-mortem.
 */
export async function exportAttempt(
  scenario: ScenarioDefinition,
  workspace: string,
  report: VerificationReport,
): Promise<ExportResult> {
  const directory = join(exportRoot(), scenario.id);
  await mkdir(directory, { recursive: true });
  const diff = await learnerDiff(workspace);
  const exportedAt = new Date().toISOString();
  const labCommit = await labVersion();

  await writeFile(join(directory, 'fix.diff'), diff);
  await writeFile(join(directory, 'verification.json'), `${JSON.stringify(verificationRecord(scenario, report, exportedAt, labCommit), null, 2)}\n`);
  await writeFile(join(directory, 'README.md'), await attemptReadme(scenario, report, exportedAt, labCommit));
  const createdPostmortem = await writePostmortemTemplateOnce(scenario, directory);
  await writePortfolioIndex();
  return { directory, changedFiles: countFiles(diff), createdPostmortem };
}

/** my-incidents/README.md: one row per exported attempt, rebuilt from every verification.json. */
async function writePortfolioIndex(): Promise<void> {
  const root = exportRoot();
  const records: { scenario: string; level: string; verdict: VerificationReport['verdict']; exportedAt: string }[] = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const file = join(root, entry.name, 'verification.json');
    if (entry.isDirectory() && existsSync(file)) records.push(JSON.parse(await readFile(file, 'utf8')));
  }
  const rows = records
    .sort((left, right) => left.scenario.localeCompare(right.scenario))
    .map((record) => `| [${record.scenario}](${record.scenario}/README.md) | ${record.level} | ${VERDICT_LABEL[record.verdict]} | ${record.exportedAt.slice(0, 10)} |`);
  const content = [
    '# My incidents',
    '',
    'Production incidents I investigated and fixed in [On-Call Gym](https://github.com/soaresdiogo/on-call-gym).',
    'Each verdict comes from the lab\'s verifier, not from me.',
    '',
    '| Incident | Level | Verdict | Verified |',
    '|---|---|---|---|',
    ...rows,
    '',
  ].join('\n');
  await writeFile(join(root, 'README.md'), content);
}

/** Verifier details contain `<id>` placeholders and pipes; code spans keep GitHub tables intact. */
function tableCode(text: string): string {
  return `\`${text.replaceAll('|', '/').replaceAll('`', "'")}\``;
}

/** Diff against the starting point, untracked files included, without touching the learner's git index. */
async function learnerDiff(workspace: string): Promise<string> {
  const temporary = await mkdtemp(join(stateRoot(), 'export-index-'));
  const index = { GIT_INDEX_FILE: join(temporary, 'index') };
  try {
    await git(workspace, ['read-tree', START_TAG], index);
    await git(workspace, ['add', '--all'], index);
    return await git(workspace, ['diff', '--cached', '--no-color', START_TAG], index);
  } finally {
    await rm(temporary, { recursive: true, force: true });
  }
}

async function labVersion(): Promise<string> {
  try {
    return (await git(REPO_ROOT, ['rev-parse', '--short', 'HEAD'])).trim();
  } catch {
    return 'unknown';
  }
}

function verificationRecord(scenario: ScenarioDefinition, report: VerificationReport, exportedAt: string, labCommit: string) {
  return {
    scenario: scenario.id,
    level: scenario.level,
    verdict: report.verdict,
    ...(report.problem ? { problem: report.problem } : {}),
    checks: report.checks.map(({ id, kind, passed, detail }) => ({ id, kind, passed, detail })),
    exportedAt,
    labCommit,
  };
}

async function attemptReadme(scenario: ScenarioDefinition, report: VerificationReport, exportedAt: string, labCommit: string): Promise<string> {
  const brief = await readFile(join(scenarioDirectory(scenario.id), 'brief.md'), 'utf8');
  const alert = brief.split('\n').filter((line) => line.startsWith('>')).join('\n');
  return [
    `# ${scenario.id}: ${scenario.title}`,
    '',
    `**Level:** ${scenario.level} · **Verdict:** ${VERDICT_LABEL[report.verdict]} · **Verified:** ${exportedAt.slice(0, 10)} with [On-Call Gym](https://github.com/soaresdiogo/on-call-gym) \`${labCommit}\``,
    '',
    '## The alert',
    '',
    alert,
    '',
    '## What the verifier checked',
    '',
    '| Check | Kind | Result | Detail |',
    '|---|---|---|---|',
    ...report.checks.map((result) => `| ${result.description} | ${result.kind} | ${result.passed ? 'pass' : 'fail'} | ${tableCode(result.detail)} |`),
    ...(report.problem ? ['', `Not verified: ${report.problem}`] : []),
    '',
    '## My work',
    '',
    '- [My post-mortem](POSTMORTEM.md)',
    '- [My fix](fix.diff)',
    '- [Raw verification result](verification.json)',
    '',
  ].join('\n');
}

async function writePostmortemTemplateOnce(scenario: ScenarioDefinition, directory: string): Promise<boolean> {
  const file = join(directory, 'POSTMORTEM.md');
  if (existsSync(file)) return false;
  await writeFile(
    file,
    [
      `# Post-mortem: ${scenario.id}`,
      '',
      '<!-- Written by you, in your own words. `npm run lab -- export` never overwrites this file. -->',
      '',
      '**Impact.** Who was affected, and how?',
      '',
      '**First signal.** What did you look at first, and what did it tell you?',
      '',
      '**Hypotheses.** What did you suspect, and which evidence confirmed or ruled each one out?',
      '',
      '**Root cause.**',
      '',
      '**Fix.** What did you change, and why does it address the root cause?',
      '',
      '**How I confirmed recovery.**',
      '',
      '**Prevention.** What test, alert or automation would catch it next time?',
      '',
    ].join('\n'),
  );
  return true;
}

function countFiles(diff: string): number {
  return diff.split('\n').filter((line) => line.startsWith('diff --git ')).length;
}
