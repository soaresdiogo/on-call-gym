# Tutor notes for false-green

## Signals worth steering toward

- The test step's log shows a failure, yet its status is success.
- The step runs a pipeline; the exit status of a pipeline is the status of its last command.
- GitHub's default shell flags differ from the flags used when `shell: bash` is explicit.

## Common detours

- Deleting `| tee test-output.log`: the check turns red, but the team loses the log artifact. The goal keeps it.
- Adding `continue-on-error` or `|| true` somewhere else: the opposite of the goal.
- Assuming the test runner is broken: the report shows the failing test ran.

## Debrief questions

- Which exit code did the step see, and where did the test's exit code go?
- Why can a check that only searches the YAML for one word miss the same class of bug?
