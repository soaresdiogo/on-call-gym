# false-green · A test fails, but the check stays green

> **REPORT** from a teammate in the pull request:
>
> "Merged after a green check. Then main broke. I opened the CI log of my PR and the test
> output literally says `1 failed`, but the job is green. Did CI ignore the failure?"

**Your goal:** a failing test turns the check red, a healthy run stays green, and the test
log is still kept.

**Level:** junior · **Track:** GitHub Actions
