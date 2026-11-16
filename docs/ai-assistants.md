# Using an AI assistant as your tutor

The tutor's teaching rules live in one file: `.claude/skills/incident-tutor/SKILL.md`. Every assistant below
uses that same file, so the behaviour (one hint at a time, no patches, debrief, then automation) is the same.
The lab and the verifiers never need an AI; the verifier is always the judge of your fix.

| Assistant | How | Status |
|---|---|---|
| Claude Code | `/incident-tutor <id>` (native skill) | tested, see [tutor-evaluation.md](tutor-evaluation.md) |
| OpenAI Codex CLI | reads `AGENTS.md`, which points it to the skill | documented, not tested by the maintainer |
| Cursor, Gemini CLI, GitHub Copilot, others | one-line prompt below | documented, not tested by the maintainer |

## Claude Code

```bash
cd on-call-gym
npm run lab -- start retry-storm
claude
> /incident-tutor retry-storm
```

The skill has `disable-model-invocation: true`, so it only runs when you call it. Optional: copy
`.claude/skills/incident-tutor/` to `~/.claude/skills/` to have it in other projects too.

## Codex CLI

Codex reads `AGENTS.md` at the repository root, which tells it to follow the tutor skill when you ask for help
with a scenario.

```bash
cd on-call-gym
codex
> Be my incident tutor for retry-storm.
```

## Any other assistant

Open the repository in the tool and send:

```
Read .claude/skills/incident-tutor/SKILL.md and follow it as my tutor for the scenario retry-storm.
Do not open scenarios/retry-storm/solution/ or scenarios/retry-storm/broken/.
```

## Keeping it honest

Assistants can read every file in the repository, solutions included. The instructions tell them not to,
and the tutor evaluation checks that Claude Code respects it. If an assistant spoils the answer, that is a
bug in the instructions: please open an issue with the transcript.
