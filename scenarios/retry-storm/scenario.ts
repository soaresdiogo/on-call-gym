import type { ScenarioDefinition } from '../../lab/core/scenario.js';
import { AUTOMATION_ENTRY, evaluateRetryStormAutomation } from './automation.js';
import { reproduceRetryStorm } from './reproduce.js';
import { verifyRetryStorm } from './verify.js';

export const retryStorm: ScenarioDefinition = {
  id: 'retry-storm',
  title: 'Checkout errors while payment calls explode',
  level: 'mid',
  kind: 'app',
  prerequisites: ['HTTP clients and timeouts', 'Reading structured logs', 'Basic load concepts (requests per second)'],
  objective:
    'Recognise when a client amplifies the load on a struggling dependency, and fix it with timeouts, capped retries and backoff with jitter.',
  readings: [
    {
      title: "Amazon Builders' Library - Timeouts, retries, and backoff with jitter",
      url: 'https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/',
    },
    {
      title: 'Google SRE Book - Addressing Cascading Failures',
      url: 'https://sre.google/sre-book/addressing-cascading-failures/',
    },
  ],
  expectedFailures: ['checkouts-recover', 'no-call-amplification', 'retries-capped', 'retries-back-off'],
  verify: verifyRetryStorm,
  reproduce: reproduceRetryStorm,
  automation: {
    entry: AUTOMATION_ENTRY,
    summary: 'A detector that flags retry storms from per-second traffic samples, tested on a bursty variant.',
    evaluate: (context) => evaluateRetryStormAutomation(retryStorm, context),
  },
};
