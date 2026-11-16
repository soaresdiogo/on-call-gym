# On-Call Gym

A local lab for practising production incidents and CI failures on a fictional store.

- Layout: `app/` healthy store, `lab/` CLI and verifiers, `scenarios/<id>/` each exercise, `docs/`.
- Commands: `npm run lab -- list | start | reproduce | hint | verify | automate | reset | stop <id>`.
- Checks before finishing a change: `npm run typecheck` and `npm test`.
- Learners: run `/incident-tutor <scenario-id>` for a tutor that gives hints, not answers
  (`.claude/skills/incident-tutor/SKILL.md`). Its teaching rules live in that file.
- When a learner is working on a scenario, do not open `scenarios/<id>/solution/` or `broken/` unless they ask
  for the solution.
- Maintenance conventions are in `AGENTS.md`.
