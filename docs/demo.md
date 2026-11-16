# Demo: retry-storm in 45 to 60 seconds

## Prepare (before recording)

```bash
cd on-call-gym
nvm use && npm ci
npm run lab -- stop retry-storm
npm run lab -- reset retry-storm --yes
npm run lab -- start retry-storm
```

Open three things side by side: a terminal at the repo root, the dashboard at http://127.0.0.1:4100/dashboard,
and an editor on `.gym/attempts/retry-storm/workspace/src/infrastructure/http-payment-gateway.ts` (do not show
it yet). Optionally, a second terminal with `claude` already open.

Do a dry run of `npm run lab -- reproduce retry-storm` once, then run the three prepare commands again so the
dashboard starts empty.

## Script

| Time | On screen | Narration (suggestion) |
|---|---|---|
| 0-8 s | Terminal: the ALERT block printed by `start` | "Your first production incident, on localhost. Checkout is failing. Customer traffic is flat." |
| 8-20 s | `npm run lab -- reproduce retry-storm`; dashboard: 20 checkouts/s, 100 payment calls/s, 0% success | "Demand: 20 per second. Calls to payments: 100 per second. We are attacking our own provider." |
| 20-28 s | Claude Code: `/incident-tutor retry-storm`, then "give me a hint" | "The tutor doesn't give me the fix. It asks how many attempts one order makes." |
| 28-40 s | Editor: timeout 250 to 2000, attempts 5 to 3, backoff with jitter; terminal: `npm run lab -- start retry-storm` | "Timeout below the provider's latency, five instant retries. Fix the client, restart." |
| 40-50 s | `npm run lab -- verify retry-storm`: six PASS lines, RECOVERED, exit 0 | "The verifier replays the same load: 100% success, one call per checkout." |
| 50-60 s | `npm run lab -- automate retry-storm`: four PASS lines including the bursty variant | "Then I let AI write a detector, and the lab tests it on a variant it has never seen." |

## Exact intervention

In `http-payment-gateway.ts` of the workspace: set `ATTEMPT_TIMEOUT_MS = 2_000`, `MAX_ATTEMPTS = 3`, and sleep
`Math.random() * Math.min(1_000, 100 * 2 ** attempt)` milliseconds between attempts. Fallback if typing live is
risky: `npm run lab -- solution retry-storm --apply --yes`, then `npm run lab -- start retry-storm`.

For the automation step, ask the tutor (after `verify`) to help write `automation/detector.ts`. Fallback:
`cp scenarios/retry-storm/automation/reference/detector.ts .gym/attempts/retry-storm/workspace/automation/`.

## Re-record from a clean state

```bash
npm run lab -- stop retry-storm
npm run lab -- reset retry-storm --yes
npm run lab -- start retry-storm
```

`reset` restores the faulty code, the automation starter and an empty database; the dashboard counters start
from zero when the store restarts.
