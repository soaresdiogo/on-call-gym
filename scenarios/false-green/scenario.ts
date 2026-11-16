import type { ScenarioDefinition } from '../../lab/core/scenario.js';
import { AUTOMATION_ENTRY, evaluateFalseGreenAutomation } from './automation.js';
import { reproduceFalseGreen } from './reproduce.js';
import { verifyFalseGreen } from './verify.js';

export const falseGreen: ScenarioDefinition = {
  id: 'false-green',
  title: 'A test fails, but the check stays green',
  level: 'junior',
  kind: 'actions',
  prerequisites: ['Reading a GitHub Actions workflow', 'Shell exit codes'],
  objective: 'Learn how a step decides its status, and make CI report failures without losing its logs.',
  readings: [
    {
      title: 'GitHub Docs - Workflow syntax: jobs.<job_id>.steps[*].shell',
      url: 'https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#jobsjob_idstepsshell',
    },
    { title: 'GNU Bash manual - Pipelines', url: 'https://www.gnu.org/software/bash/manual/html_node/Pipelines.html' },
  ],
  expectedFailures: ['red-on-failing-test'],
  verify: verifyFalseGreen,
  reproduce: reproduceFalseGreen,
  automation: {
    entry: AUTOMATION_ENTRY,
    summary: 'A detector that flags green runs whose evidence shows failing or missing tests.',
    evaluate: evaluateFalseGreenAutomation,
  },
};
