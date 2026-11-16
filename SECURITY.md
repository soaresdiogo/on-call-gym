# Security policy

On-Call Gym is a local learning lab: it binds to `127.0.0.1`, uses fictional data and needs no credentials.
Its scenarios contain bugs on purpose; those are not vulnerabilities.

Please report real security issues in the lab itself (for example the CLI touching files outside the
repository, a service listening beyond loopback, or a supply-chain problem) privately through
**GitHub > Security > Report a vulnerability** on this repository. Do not open a public issue.

You can expect an answer within 7 days. Fixes are released on `main`; there are no maintained older versions.
