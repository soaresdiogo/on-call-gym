# Maintenance notes for agents

- Node version is pinned in `.nvmrc` (also used by CI). Use `npm ci`; keep exact versions in `package.json`.
- TypeScript is strict. Run `npm run typecheck` and `npm test` before proposing a change.
- The healthy store in `app/` is the reference solution of every app scenario. A change there must keep every
  scenario's meta-test green (`lab/test/scenarios.test.ts`): the broken version fails for its `expectedFailures`,
  and the reference recovers.
- A scenario's fault lives in `scenarios/<id>/broken/` as whole files that replace files of `app/`. If you change
  a file of `app/` that a scenario overrides, update that scenario's broken copy too.
- Verifiers return checks; they must never pass on an empty check list or a store that did not start.
  Exit codes: 0 recovered, 1 still failing, 2 not verified.
- Learner-facing text (`brief.md`, `hints.md`) describes symptoms, never causes.
- Everything binds to 127.0.0.1. Lab state lives in `.gym/` (git-ignored). Never touch files outside the repo.
- English for code, docs and commit messages.

## When a learner asks for the tutor

If a learner asks for help with a scenario ("help me with retry-storm", "be my incident tutor"), read
`.claude/skills/incident-tutor/SKILL.md` and follow it exactly, using the scenario id they mention in place of
`$ARGUMENTS`. It is the single source of the tutor's teaching rules for every assistant (Claude Code, Codex
CLI and others). Do not read `scenarios/<id>/solution/` or `scenarios/<id>/broken/` while they investigate.
