# Post-mortem: false-green

**Impact.** A pull request with a failing test was merged on a green check. Main was broken until the next
change was investigated; nobody trusted CI for the rest of the day.

**Trigger.** The test step was changed to keep a copy of its output: `npm run test:app 2>&1 | tee test-output.log`.

**Root cause.** Without an explicit `shell:`, GitHub runs steps on Linux with `bash -e {0}`, which has no
`pipefail`. A pipeline's exit status is the status of its last command, `tee`, which succeeded. The test
failure was printed and then discarded.

**Mitigation.** `shell: bash` on the step (GitHub then runs `bash --noprofile --norc -eo pipefail {0}`),
keeping `tee` and the log artifact.

**Prevention.**
- Set `defaults.run.shell: bash` at the workflow level.
- Judge CI by evidence: fail the job when the test report shows failures or no tests at all.
- Keep a canary test that is made to fail on purpose when CI changes, and check the colour.

**Automation idea.** A detector that reads the run's test report and flags any green run with failures or no
tests. See `automation/reference/detector.ts`; try it with `npm run lab -- automate false-green`.
