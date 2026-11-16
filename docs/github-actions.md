# GitHub Actions track

The Actions challenges use the same store and its real test scripts. Each challenge has a faulty workflow kept
outside `.github/workflows/` (in `scenarios/<id>/broken/workflow.yml`), so it never runs by accident. You
install one exercise at a time on a branch of your own fork.

## Practise locally first

```bash
npm run lab -- start false-green        # copies the faulty workflow to .gym/attempts/false-green/workspace/workflow.yml
npm run lab -- reproduce false-green    # runs it with a deliberately failing test and shows the check colour
npm run lab -- verify false-green       # failing test must be red, healthy fixture green, tests must really run
```

The local runner (`lab/actions/local-runner.ts`) models only what decides a check's colour: the default shell
(`bash -e {0}`) versus `shell: bash` (`bash --noprofile --norc -eo pipefail {0}`), `continue-on-error`, and the
status functions in `if:`. `uses:` steps and `npm ci` are skipped because your checkout already has them. It
refuses expressions, services, matrices and containers instead of guessing; when it does, validate on GitHub.

## Run it on GitHub

1. **Fork** the repository and clone your fork.
2. **Enable Actions on the fork**: open the *Actions* tab of your fork and click
   *I understand my workflows, go ahead and enable them*.
3. **Create the base branch** the pull request will target:
   ```bash
   git switch -c gym/base
   git push -u origin gym/base
   ```
4. **Create the exercise branch** and install the workflow you are working on (the lab refuses to do it on `main`):
   ```bash
   npm run lab -- start false-green
   git switch -c gym/false-green
   npm run lab -- install-workflow false-green   # writes .github/workflows/gym-false-green.yml
   ```
5. **Make a test fail on purpose**: in `app/test/fixtures/ci-canary.json` change `expectedTotalCents` from
   `2598` to `2599`. This is a real change to the application's tests.
6. **Commit, push and open a pull request between your own branches**:
   ```bash
   git add .github/workflows/gym-false-green.yml app/test/fixtures/ci-canary.json
   git commit -m "Try the false-green exercise"
   git push -u origin gym/false-green
   gh pr create --repo <you>/on-call-gym --base gym/base --head gym/false-green --title "gym: false-green" --body "Exercise"
   ```
   On the web, make sure the *base repository* is your fork, not the upstream project.
7. **Observe the incident**: the `gym-false-green / test` check is green while its log shows `1 failed`. The
   official `ci` workflow on the same PR is red, because it runs the tests without the faulty pipeline.
8. **Fix** the workflow in your workspace, `npm run lab -- verify false-green` locally, then
   `npm run lab -- install-workflow false-green` again, commit and push. The check must turn red.
9. **Restore the fixture** (`2598`), commit and push. The check must turn green, and the log must show the
   tests ran (13 tests, 0 failed).
10. **Clean up**: close the PR and delete `gym/false-green` (keep `gym/base` for the next challenge).

## What needs a real run

| Behaviour | Locally | On GitHub |
|---|---|---|
| Default shell without `pipefail` hides the failure | modelled by the local runner | observe on the PR (step 7) |
| `shell: bash` makes the step fail | modelled | observe (step 8) |
| The check colour on the pull request | not modelled | required |
| The test log artifact upload | skipped | required |

## Maintainer acceptance procedure

Before a release, run steps 1 to 9 on a fork and record in `docs/validation.md`: the PR URL, the run URL of the
green-but-failing run, the red run after the fix, and the green run with the healthy fixture.
