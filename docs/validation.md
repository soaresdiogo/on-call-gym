# Validation record

What has actually been run, where, and what is still pending. Update this file before each release.

## Local (macOS, Node 24.22.2, 2026-11-16)

| What | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | clean |
| Full test suite | `npm test` | 9 files, 58 tests passed (about 55 s) |
| Store tests | `npm run test:app` | 13 tests passed |
| Every scenario fails before the fix for its `expectedFailures` | `lab/test/scenarios.test.ts` | 6/6 |
| Every reference solution recovers, regression checks included | `lab/test/scenarios.test.ts` | 6/6 |
| Broken workspaces typecheck | `lab/test/workspace-typecheck.test.ts` | 5/5 app scenarios |
| Local Actions runner semantics | `lab/test/local-runner.test.ts` | default shell without pipefail, `shell: bash`, `continue-on-error`, `always()`, refusal of expressions |
| README flow: list, start, verify (exit 1), fix, verify (exit 0), reset refuses without a terminal (exit 2), reset --yes, stop | `lab/test/cli.test.ts` | passed |
| A store that cannot load is "not verified" (exit 2), not a failure | `lab/test/cli.test.ts` | passed |
| `retry-storm` reproduce against the running stack | `npm run lab -- reproduce retry-storm` | normal phase 100% success, 1.00 calls per checkout; slow phase 0% success, 5.00 calls per checkout (100 calls/s for 20 checkouts/s) |
| `retry-storm` verify, faulty vs reference | `npm run lab -- verify retry-storm` | 0/60 vs 60/60 checkouts; 5.00 vs 1.00 calls per checkout; 5 vs 3 attempts in an outage; median retry gap 1 ms vs 175 ms |
| `retry-storm` automation | `npm run lab -- automate retry-storm` | starter fails; reference detector passes 4/4; a latency-threshold detector fails the bursty variant |
| `false-green` verify, faulty vs reference | `npm run lab -- verify false-green` | faulty: green with 13 tests run and 1 failed; fixed: red with the failing canary, green with the healthy fixture |
| `false-green` automation | `npm run lab -- automate false-green` | starter fails; reference passes 5/5; a "grep the YAML for pipefail" detector fails the variant |
| `order-not-found`, `double-submit`, `duplicate-webhook`, `oversold-inventory` against the running stack | `start`, `reproduce`, `verify` | symptom shown (500; two orders; two shipments; two paid orders for one unit); verify exits 1 |
| Tutor skill in the real Claude Code client | see [tutor-evaluation.md](tutor-evaluation.md) | 4/4 cases pass |

## Not yet validated

| What | Why | How to close it |
|---|---|---|
| `false-green` on a real fork (check colour on a PR, artifact upload) | needs a real GitHub run on a fork | follow the acceptance procedure in [github-actions.md](github-actions.md) |
| Quickstart on Linux / WSL | only macOS was available; the official CI covers Linux for `npm ci` and `npm test` | clean clone on a Linux machine or a Codespace |
| Tutor through Codex CLI and other assistants | not available to the maintainer | follow [ai-assistants.md](ai-assistants.md) and record results here |
| Pilot with real learners | planned | [launch-checklist.md](launch-checklist.md) |
