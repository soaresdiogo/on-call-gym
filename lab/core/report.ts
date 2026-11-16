import { print, style } from './console-output.js';
import type { VerificationReport } from './verification.js';

export function printReport(title: string, report: VerificationReport): void {
  print(style.bold(title));
  for (const result of report.checks) {
    const mark = result.passed ? style.green('PASS') : style.red('FAIL');
    print(`  ${mark}  [${result.kind}] ${result.description}`);
    print(style.dim(`        ${result.detail}`));
  }
  print();
  printVerdict(report);
}

function printVerdict(report: VerificationReport): void {
  const failed = report.checks.filter((result) => !result.passed).length;
  if (report.verdict === 'recovered') {
    print(style.green(`RECOVERED: all ${report.checks.length} checks passed.`));
    return;
  }
  if (report.verdict === 'still_failing') {
    print(style.red(`STILL FAILING: ${failed} of ${report.checks.length} checks failed.`));
    return;
  }
  print(style.yellow(`NOT VERIFIED: ${report.problem ?? 'unknown problem'}`));
  print(style.yellow('This is a lab or environment problem, not a verdict about your fix.'));
}
