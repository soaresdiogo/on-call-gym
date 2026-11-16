# Launch checklist

Publication is the maintainer's call. Nothing here is automated.

## Before going public

- [ ] Pilot with Ivo and two more developers (one junior, one senior). Each one completes at least
      `order-not-found` and `retry-storm` without help from the maintainer. Collect where they got stuck.
- [ ] Quickstart verified on a clean clone (`git clone`, `nvm install`, `npm ci`, the six README commands) on macOS
      and on Linux or WSL.
- [ ] `false-green` accepted on a real fork following `docs/github-actions.md`; run URLs recorded in
      `docs/validation.md`.
- [ ] Tutor evaluation re-run (`docs/tutor-evaluation.md`) with the current skill.
- [ ] README links checked on GitHub (relative links, badges if added).
- [ ] Repository settings: description "Your first production incident, on localhost.", topics below,
      Discussions on, issue template visible, branch protection on `main` with the `ci` check.

## Content

- [ ] Demo recorded from `docs/demo.md` (45 to 60 seconds).
- [ ] Clip for YouTube Shorts and LinkedIn (vertical crop of the demo; the 100 calls/s moment in the first 5 s).
- [ ] Technical post-mortem article for DEV: "I built a lab that breaks production on purpose", with the
      retry-storm numbers (0/60 to 60/60 checkouts, 5.00 to 1.00 payment calls per checkout).

## Suggested GitHub topics

`incident-response`, `github-actions`, `typescript`, `sre`, `claude-code`, `on-call`, `chaos-engineering`,
`devops`, `learning`, `fastify`
