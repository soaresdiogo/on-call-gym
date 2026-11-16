# Hints for false-green

## Hint 1

Run `npm run lab -- reproduce false-green` and compare each step's *outcome* with the job's colour.
Which step printed the failure, and which status did that step end with?

## Hint 2

A step's status comes from the exit code of the script it ran. In the failing step, more than one
command runs. Try it in your terminal: run the same line with a test that fails, then run
`echo "${PIPESTATUS[@]}"` or `echo $?` right after it.

## Hint 3

Read what GitHub runs for each `shell:` value, and compare the flags used when `shell` is unspecified
with the flags used for `shell: bash` (link in the readings). Bash's manual explains which exit code a
pipeline returns.
