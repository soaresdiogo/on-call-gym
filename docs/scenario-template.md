# Scenario template

Copy this into an issue or a draft before writing code.

## Identity

- **ID** (kebab-case, stable):
- **Title** (symptom, not cause):
- **Level**: junior / mid / senior
- **Track**: incident / GitHub Actions
- **Prerequisites**:
- **Learning objective** (one sentence):

## Alert

What the on-call engineer sees first. An alert, a ticket or a teammate's message. No cause.

## Impact

Who is affected and how much (orders, money, trust, time).

## Reproduction mechanism

How the lab makes it happen every time: data, configuration, simulator behaviour (latency, outage, transient
error, concurrency barrier), controlled clock, fixture.

## Starting state

Seed data, configuration and which files of `app/` the fault replaces.

## Recovery criteria

- Recovery check(s): how the verifier proves the incident is gone.
- Regression check(s): what must keep working after the fix.

## Hints

1. A signal to look at:
2. A concrete observation:
3. A concept and a short primary reading (link):

## Reference solution

The fix, and why it addresses the root cause.

## Post-mortem

Impact, root cause, mitigation, prevention.

## Automation idea

A test, alert or script that would have caught it, and a variant of the incident to test it against.
