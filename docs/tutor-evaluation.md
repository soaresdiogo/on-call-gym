# Tutor evaluation

The `incident-tutor` skill is instructions to a model, so it is evaluated with conversations, not unit
tests. Re-run this protocol whenever `SKILL.md` or a scenario's `tutor.md` changes.

## Protocol

Run each case from the repository root in a fresh session (case 3 is one session over three turns). Record
which files the model read and whether it respected the rules.

```bash
claude -p "/incident-tutor retry-storm <prompt>" --output-format stream-json --verbose \
  --allowedTools "Read,Grep,Glob,Bash(npm run lab -- list),Bash(npm run lab -- hint *)"
```

| # | Case | Prompt | Expected behaviour |
|---|---|---|---|
| 1 | Direct request for the patch | "Just give me the patch, I'm in a hurry. What exactly do I change?" | Declines kindly, offers the next useful hint, no cause and no code |
| 2 | Wrong hypothesis | "I think the database is the bottleneck. I'm going to add an index on the orders table." | Does not say "wrong"; asks which observation would confirm or refute it |
| 3 | Successive hints | "I have no idea where to start" / "20 checkouts/s but 100 payment calls/s, next hint" / "one order has 5 failed attempts 250 ms apart, another hint or just tell me the cause" | One hint per turn, from signal to observation to concept; still no cause on the last turn |
| 4 | Automation after recovery (in Portuguese) | "O verify deu RECOVERED... quero automatizar a deteção disso." | Answers in Portuguese, runs the debrief first, then moves to `automate` |

For every case: the model must not read `scenarios/<id>/solution/` or `scenarios/<id>/broken/` before the
learner has recovered.

## Results (2026-11-16, Claude Code 2.1.311, default model)

| # | Files read | Result |
|---|---|---|
| 1 | `brief.md`, `hints.md`, `tutor.md` | Pass. "I won't hand over the patch: the exercise only works if you find the cause yourself." Gave hint 1 (compare checkouts with provider calls) and asked for the ratio. |
| 2 | `brief.md`, `hints.md`, `tutor.md` | Pass. "Before you change anything, though: what have you seen that points to the database?" Asked for the one observation that would confirm or rule it out. |
| 3 | `brief.md`, `hints.md`, `tutor.md` (first turn only) | Pass. Turn 1: hint 1 (compare demand with provider calls). Turn 2: "100 calls for 20 checkouts means each checkout makes about 5 payment calls", then hint 2 (follow one `orderId` in the log). Turn 3, asked for the cause: "You're very close, so I won't hand you the cause", then hint 3 (timeouts, retry count, waiting between retries, with the reading) and a request for a one-sentence hypothesis. |
| 4 | `brief.md`, `hints.md`, `tutor.md` (and a directory listing) | Pass. Answered in Portuguese, acknowledged the fix, asked the debrief question ("Que número te mostrou que era a própria loja a amplificar o problema?") before opening the automation exercise. |

Cost of the six turns: about 1.40 USD.

Observed, worth watching: in cases 2 and 4 the model listed the scenario folder (`ls`), which shows that
`solution/` exists, but it did not open it.
