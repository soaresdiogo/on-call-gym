# Contributing to On-Call Gym

The most valuable contribution is a new incident. You can help in three ways:

1. **Propose an incident** with no code: open an issue with the
   [incident proposal](.github/ISSUE_TEMPLATE/incident-proposal.yml) form. Anonymise everything.
2. **Implement a roadmap scenario**: pick one from [docs/roadmap.md](docs/roadmap.md) (alert and recovery
   criteria are already written) and comment on its issue so nobody duplicates the work.
3. **Improve an existing scenario**: clearer hints, a better variant, a sharper post-mortem.

## Setup

```bash
nvm use && npm ci
npm run typecheck
npm test
```

## How a scenario works

```
scenarios/<id>/
  scenario.ts            metadata, verifier and reproduce function (TypeScript)
  brief.md               the alert or ticket the learner gets: symptom only, never the cause
  hints.md               exactly three "## Hint N" sections: a signal, an observation, a concept + reading
  tutor.md               notes for the AI tutor: signals, common detours, debrief questions (no fix)
  broken/                whole files that replace files of app/ to inject the fault
  solution/postmortem.md impact, root cause, mitigation, prevention, automation idea
  automation/            optional: starter/ (copied to the workspace) and reference/
```

For app scenarios, the healthy store in `app/` **is** the reference solution. The meta-test in
`lab/test/scenarios.test.ts` proves, for every scenario, that the broken version fails for the reasons listed
in `expectedFailures` and that the reference recovers. Actions challenges keep their fixed workflow in
`solution/files/`.

## Create a scenario step by step

1. **Write the story first.** Copy [docs/scenario-template.md](docs/scenario-template.md) into the issue or a
   draft. If you cannot describe a deterministic reproduction and a recovery criterion, the scenario is not
   ready yet.
2. **Create the folder** `scenarios/<id>/` (kebab-case id, stable forever).
3. **Inject the fault.** Copy the file(s) of `app/src/` you need into `scenarios/<id>/broken/src/...` at the same
   path and break them the way the real incident did. Keep the code plausible: a wrong constant, a missing
   check, a renamed header. Avoid comments that point at the bug.
4. **Make it deterministic.** Use the payment provider simulator (`lab/simulators/payment-provider.ts`) for
   latency, outages, transient errors and the concurrency barrier. Seed data with SQL in the verifier (and in
   `stackSetup` for the running stack). Never rely on timing luck: if a race is the point, hold both parties
   with `holdUntilConcurrent`.
5. **Write the verifier** in `scenario.ts`. Use `withHarness` to boot the learner's store and `check(...)` to
   return results. Include at least one `recovery` check (the incident is gone) and one `regression` check (the
   behaviour that must survive the fix). List the recovery checks the broken version fails in `expectedFailures`.
6. **Write `reproduce`** so `npm run lab -- reproduce <id>` shows the symptom against the running stack.
7. **Write the learner material**: `brief.md` (symptom, impact, goal; first line `# <id> · <title>`),
   `hints.md` (three hints, at least one primary-source reading in `readings`), `tutor.md`.
8. **Write `solution/postmortem.md`** with the five sections the catalog test requires.
9. **Register it** in `scenarios/index.ts`.
10. **Run** `npm run typecheck && npm test`. Then try it as a learner: `npm run lab -- start <id>`, reproduce,
    hint, fix, verify.

## Review checklist

- The brief does not reveal the cause, and the title in `list` does not either.
- The broken version fails for the documented reason, and only that.
- Removing the feature is not a valid fix (a regression check catches it).
- The verifier never passes when the store did not start or no check ran (the framework enforces this).
- Everything binds to `127.0.0.1`, uses fictional data, and needs no credentials.

## Style

English for code, docs and commits. TypeScript strict. Small functions, named constants, tests in
Arrange/Act/Assert. Keep the store simple enough that a learner can read the code under investigation in
ten minutes.
