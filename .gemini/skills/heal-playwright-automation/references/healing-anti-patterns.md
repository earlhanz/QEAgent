# Healing Anti-Patterns and Guardrails

Never use these as a way to make a failing run green:

- Delete, skip, weaken, loosen, or replace a meaningful assertion without design-backed proof that the assertion itself is wrong.
- Change expected values to match observed incorrect application behavior.
- Add `page.waitForTimeout()`, hard sleeps, arbitrary polling, or unbounded retries.
- Use `{ force: true }` to bypass actionability or overlay problems.
- Change to broad CSS/XPath, `.first()`, `.last()`, or `.nth()` without evidence and a documented reason.
- Add catch-and-ignore logic, swallow response errors, or suppress test failures.
- Disable parallelism or share mutable state to hide data collisions without diagnosing ownership/isolation.
- Modify application code, fixtures, global config, or unrelated tests as a side effect of healing one spec.
- Treat a single passing rerun as proof of stability; use the requested repeat command when execution is appropriate.
- Claim a fix or verification if no diff/run evidence exists.

Before returning, confirm root-cause classification preceded edits; app bugs were not masked; changes are minimal; assertions remain in specs; locators remain in page/components; and prior approval is invalidated if code changed.
