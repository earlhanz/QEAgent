# Playwright Execution Standard

## Select and launch

- Inspect the project's package scripts, `playwright.config.ts`, README/CI workflow, and target specs before choosing a command.
- Prefer the documented project script (for example `npm run test:e2e -- --project=chromium`) over an invented direct command.
- Limit execution to the requested project/spec/tag/browser. Preserve configured retries, workers, reporters, and output directories unless the request requires a scoped override.
- Record the exact command, working directory, browser/project, environment identifier, time, exit code, and runner-reported totals.

## Evidence collection

- Capture the concise runner summary and per-test failure detail.
- Preserve useful trace, screenshot, video, and HTML/JSON report paths. Open traces/DOM snapshots when available before classifying locator/timing failures.
- Never print environment secrets, cookies, tokens, or full storage-state files. Redact them from excerpts.
- Distinguish initial-run results, healing changes, and follow-up reruns. Keep the initial failure in the final summary even if a rerun passes.

## Failure classification

- **Test Script / Automation Problem:** test code, locator, synchronization, fixture, or test assertion does not implement approved design/scenario correctly. Immediately hand off to Heal Playwright Automation.
- **Genuine Application Bug:** valid test setup and request reach the application, but observed behavior contradicts approved design/contract. Preserve the failing test and report a defect; never heal the test to hide it.
- **Environment / Test Data / Infrastructure:** invalid/expired data or auth, unreachable environment/dependency, misconfiguration, resource exhaustion, or runner issue. Report as blocked/indeterminate unless evidence supports a more precise diagnosis.

When evidence is ambiguous, do not guess or edit. Gather targeted evidence or report unresolved classification. A stack trace alone may not distinguish a script failure from an app regression.

## Stability reruns

After a script fix, use `npx playwright test <file> --repeat-each=3` for the affected spec when authorized and supported. Record each run's result. Three passes are useful stability evidence for the reproduced failure, not proof that all flakiness is eliminated. If the project uses a wrapper or different package manager, preserve its equivalent configured invocation and state the exact command used.

## Final accounting

Report initial suite totals, failure classifications, every healed test and changed file/method, every post-heal result, remaining application defects, and report/trace paths. If rerunning was not possible, say so explicitly. Never replace initial failure counts with post-heal totals without showing both.
