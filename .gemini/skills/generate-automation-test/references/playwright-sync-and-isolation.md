# Playwright Synchronization and Isolation Standard

## Synchronization

- Rely on Playwright actionability auto-waits and web-first assertions (`await expect(locator).toBeVisible()`, `toHaveText()`, etc.).
- Never use `page.waitForTimeout()` or fixed sleeps. Wait for a meaningful locator, response, URL, or application state.
- Avoid manual polling when a locator assertion or Playwright wait API expresses the condition.

## Independent tests

- Every test must pass alone and in a different order; target `fullyParallel: true` safety.
- Avoid shared mutable accounts/records. Create unique test-owned data and clean it up in teardown when appropriate.
- Prefer API-driven setup through `APIRequestContext` over lengthy UI setup when the API is available and permitted.
- Do not depend on another test's state, order, worker, or browser session.
- Reuse auth state only when safe for parallel tests; tests mutating shared auth state need isolation.
- Inspect project CI/config before global changes. If existing statefulness prevents full parallelism, report the blocker and make generated tests independently safe.

## API tests

Use documented paths, payloads, and response contracts. Put reusable request setup in an API client/fixture. Keep response assertions in `.spec.ts`. Do not hardcode secrets; use approved secret configuration and synthetic data.
