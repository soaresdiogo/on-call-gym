# On-Call Gym

**Your first production incident, on localhost.**

A small, fictional coffee store that breaks in realistic ways. You get an alert, form a hypothesis,
investigate with logs and metrics, fix the code, and a verifier tells you whether the store really
recovered. If you get stuck, an optional Claude Code tutor gives you hints without the answer. Once you
have recovered, you can use AI to automate the detection and test it on a variant of the incident.

```bash
git clone https://github.com/soaresdiogo/on-call-gym.git && cd on-call-gym
nvm install        # installs and selects Node 24.22.2 from .nvmrc
npm ci
npm run lab -- list
npm run lab -- start retry-storm
npm run lab -- verify retry-storm
npm run lab -- reset retry-storm
npm run lab -- stop retry-storm
```

No Docker, no cloud account, no secrets. Everything runs on `127.0.0.1`.

## Why

Companies want engineers who have seen production break. Side projects rarely do. On-Call Gym gives you
incidents you can cause, investigate and fix on purpose, with the same signals you would have at work:
an alert, structured logs with correlation ids, per-second metrics, and a dependency that misbehaves.

## Requirements

- Node.js 24.22.2 (`.nvmrc`; `nvm install` or `fnm install` reads it) and npm
- git
- macOS, Linux or WSL
- Optional: [Claude Code](https://claude.com/claude-code) for the tutor, and a GitHub fork for the Actions track

The database is [PGlite](https://pglite.dev), PostgreSQL compiled to WebAssembly, so the store has real
SQL semantics (unique constraints, `UPDATE ... RETURNING`, `ON CONFLICT`) without a database server.

## Catalog

| ID | Level | Track | You get... |
|---|---|---|---|
| `order-not-found` | junior | incident | A 5xx alert on the order tracking endpoint |
| `double-submit` | junior | incident | A ticket: one click, two orders |
| `false-green` | junior | GitHub Actions | A failing test in the log, a green check on the PR |
| `retry-storm` | mid | incident | Checkout failing while payment calls explode |
| `duplicate-webhook` | mid | incident | The warehouse packed two parcels for one order |
| `oversold-inventory` | senior | incident | Two customers bought the last unit |

19 more incidents and 4 more Actions challenges are specified in [docs/roadmap.md](docs/roadmap.md). Each
one has its alert and recovery criteria written, ready for a contributor to implement.

## A session

```bash
npm run lab -- start retry-storm       # prepares your workspace, starts the store, prints the alert
npm run lab -- reproduce retry-storm   # replays the incident traffic and shows what on-call would see
```

`start` copies the store into `.gym/attempts/<id>/workspace/` and applies the fault. That copy is yours to
edit: your main checkout is never touched, and `git diff` inside the workspace shows your changes. Running
`start` again resumes the attempt and restarts the store with your edits.

While the store is running:

- Shop: http://127.0.0.1:4100
- Dashboard (checkouts, success rate, payment calls per checkout, p95): http://127.0.0.1:4100/dashboard
- Structured logs: `.gym/attempts/<id>/runtime/store.log` (JSON, one line per event, with `reqId` and `orderId`)

### Without the tutor

```bash
npm run lab -- hint retry-storm        # hint 1, then 2, then 3 (the last one adds primary readings)
npm run lab -- hint retry-storm 2      # a specific hint
```

### With the tutor (Claude Code)

```bash
claude                                 # from the repository root
> /incident-tutor retry-storm
```

The skill lives in `.claude/skills/incident-tutor/SKILL.md`. It starts from your hypothesis, gives one hint
at a time, leaves every edit to you, and refuses to hand over the patch. After you recover, it asks you to
explain the evidence. Only then does it help you automate. To reuse it in other projects, copy the folder
to `~/.claude/skills/incident-tutor/` (optional). The lab and the verifiers work without Claude Code.

Using Codex CLI, Cursor, Gemini CLI or another assistant? The same skill file works through `AGENTS.md` or a
one-line prompt: see [docs/ai-assistants.md](docs/ai-assistants.md).

## Verify, reset, stop

```bash
npm run lab -- verify retry-storm
```

| Exit code | Verdict | Meaning |
|---|---|---|
| `0` | `RECOVERED` | Every recovery check and every regression check passed |
| `1` | `STILL FAILING` | The incident is still there, or your fix broke something that must keep working |
| `2` | `NOT VERIFIED` | The lab could not reach a verdict: the store did not start, a check could not run, the scenario was never started |

A store that never started, or a verifier that ran no checks, is never reported as a pass.

```bash
npm run lab -- reset retry-storm       # back to the starting code and data; asks before discarding your changes
npm run lab -- reset retry-storm --yes # no question (scripts)
npm run lab -- stop retry-storm        # stops the services; your workspace is kept
npm run lab -- solution retry-storm --reveal   # post-mortem and reference fix, after you are done
```

## Keep your solved incidents (portfolio)

Your attempts live in `.gym/`, which git ignores, so nothing you do while studying is pushed anywhere. You only
need a clone to practise. When you want to show your work, fork the repository and export the attempt:

```bash
npm run lab -- export retry-storm
```

`export` runs the verifier first, then writes `my-incidents/retry-storm/`:

| File | What it holds |
|---|---|
| `README.md` | The alert, every check with its result, and the verdict |
| `fix.diff` | Your changes since the start of the exercise |
| `verification.json` | The same result, machine-readable, with the date and the lab commit |
| `POSTMORTEM.md` | A template for your own post-mortem. Created once and never overwritten |

It also rebuilds `my-incidents/README.md`, an index of every incident you exported. Commit the folder on your
fork (`git add my-incidents && git commit -m "Solve retry-storm"`). The verdict comes from the verifier, so
an attempt that is still failing is exported as STILL FAILING.

## Automate it, then try it on a variant

`retry-storm` and `false-green` include an automation exercise. Your workspace has `automation/detector.ts`
with a typed contract. Write a detector (with AI, if you like), then:

```bash
npm run lab -- automate retry-storm
```

The lab records real traffic against the faulty and the fixed store, for the original incident and for a
variant with a different failure pattern. Your detector must alert on both storms and stay quiet on both
healthy runs. A latency threshold barely separates them: the healthy store reaches a p95 of about 860 ms in the
bursty variant and the faulty one about 1,150 ms, so 500 ms fails and only a narrow band passes. Payment calls per
checkout separate them by a wide margin. For `false-green`, a check that only
greps the YAML for one line misses the variant. The other scenarios describe an automation idea in their
post-mortem.

## GitHub Actions track

`false-green` runs locally with a small runner that models what decides a check's colour (default shell
flags, `continue-on-error`, `if:` status functions) and refuses anything it does not model. To see the real
thing on GitHub, follow [docs/github-actions.md](docs/github-actions.md): fork, enable Actions, create
`gym/base`, install the exercise workflow on its own branch, and open a pull request between your branches.

| Behaviour | Local runner | Needs a real GitHub run |
|---|---|---|
| Default shell has no `pipefail`; `shell: bash` adds it | yes | confirms it |
| `continue-on-error` keeps the job green | yes | confirms it |
| Check colour shown on the pull request | no | yes |
| Artifact upload of the test log | skipped locally | yes |

## How it is built

```
app/          the healthy store (Fastify + PGlite), also the reference solution of every app scenario
lab/          CLI, verifiers framework, payment provider simulator, local Actions runner
scenarios/    one folder per exercise: brief, hints, tutor notes, broken files, verifier, post-mortem
.claude/      the incident-tutor skill
docs/         roadmap, scenario template, Actions guide, demo script, tutor evaluation, launch checklist
```

Each scenario's fault is a set of files that replace files of the healthy store. Verifiers boot the
learner's store in-process against a programmable payment provider (latency that grows with load, outages,
transient errors, a concurrency barrier) and check behaviour over HTTP and state in the database. The
official CI (`.github/workflows/ci.yml`) proves, for every scenario, that the broken version fails for the
documented reason and that the reference solution recovers without breaking the regression checks.

## Contributing

New incidents are the best contribution, and you do not need code to propose one: open an
[incident proposal](.github/ISSUE_TEMPLATE/incident-proposal.yml) with an anonymised story. To implement
one, start from [docs/scenario-template.md](docs/scenario-template.md) and read [CONTRIBUTING.md](CONTRIBUTING.md).

## Resumo em português

O On-Call Gym é um laboratório local para praticar incidentes de produção e falhas de CI numa loja fictícia.
Você recebe um alerta, investiga com logs e métricas, corrige o código e um verificador confirma se a loja
recuperou (código de saída 0), se continua com falha (1) ou se não foi possível verificar (2). O tutor
opcional para Claude Code (`/incident-tutor <id>`) dá pistas graduais sem entregar a resposta. Depois da
recuperação, dá para automatizar a deteção com IA e testá-la numa variante do incidente. Não precisa de
Docker nem de conta na cloud: `npm ci` e `npm run lab -- start retry-storm`.

## Community

[Code of conduct](CODE_OF_CONDUCT.md) · [Security policy](SECURITY.md) · [What has been validated](docs/validation.md)

## License

MIT. See [LICENSE](LICENSE). All data, companies and people in the scenarios are fictional.
