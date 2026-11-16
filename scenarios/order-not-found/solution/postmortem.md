# Post-mortem: order-not-found

**Impact.** Every lookup of an unknown order answered 500. The 5xx alert fired and burned error budget for
what were customer typos; real failures were hidden in the noise.

**Root cause.** `GetOrder` cast the repository result to `Order` (`order as Order`) instead of handling
`null`. Building the view read `order.status` on `null`, threw a `TypeError`, and the error handler correctly
treated an unexpected exception as a server error.

**Mitigation.** Throw `NotFoundError` when the repository returns `null`; the existing error handler maps it
to 404 with a stable error code.

**Prevention.**
- Treat type casts that remove `null` as a review smell.
- Test the unhappy paths of every read endpoint (unknown id, malformed id).
- Alert on 5xx only; track 4xx as product signals.

**Automation idea.** A contract test that calls each `GET /<resource>/:id` route with a random id and fails on
any 5xx. Try generating it with AI from the route list, then run it against another scenario's store.
