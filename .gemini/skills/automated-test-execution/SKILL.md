---
name: automated-test-execution
description: Execute approved Playwright TypeScript automated test suites, classify failures as test-script problems or genuine application defects, immediately route script problems to Heal Playwright Automation, and report complete run and healing summaries.
---

# Automated Test Execution

## Purpose and routing

Run existing, approved Playwright TypeScript automated tests and report observed results. Use for explicit requests to run/execute a suite, spec, project, or CI-equivalent test command. Do not use for creating tests (`generate-automation-test`), reviewing code without execution (`automated-test-reviewer`), or standalone failure repair (`heal-playwright-automation`).

The QEAgent orchestrator must invoke this skill for execution requests. When it returns a test-script failure, the orchestrator must immediately invoke `heal-playwright-automation` for the failing test, then call this execution agent again on the affected spec to verify the fix. Use the stability command when the user's execution request permits. Repeat the heal → targeted retest cycle at most twice per failure; if it still fails, stop and report unresolved evidence rather than looping. Include all healed test names and exact changes in the final execution summary.

## Preconditions and scope

1. Run `node .gemini/tools/qe-workflow.js check-approved automation <project>`. It confirms analysis, manual, and automation approvals and that their artifacts are unchanged since approval. If it fails, run nothing unless the user explicitly requests a pre-approval diagnostic run; label such a run `diagnostic` in its summary. A prior approval never covers later code changes.
2. Identify the exact project, test scope, configured Playwright command, browser/project, environment, and any requested tags/shards. Use only the selected project; do not scan other projects.
3. Inspect `playwright.config.ts`, package scripts, test documentation, and project execution standard. Use the established command. Never invent a destructive setup/cleanup command or production target.
4. Confirm the target environment is appropriate and test data/auth state is available. Do not reveal credentials or secrets in output.
5. If the requested command or target is ambiguous or could affect production/shared data, stop and clarify. Report the exact command before execution if it is outside established safe project scripts.

## Execution workflow

1. Read `references/playwright-execution-standard.md` and `.gemini/skills/_shared/references/agent-handoff-standard.md`. Inspect only the selected test scope/configuration.
2. Create a unique run directory at `output/<project>/.qe/runs/<run-id>/`. Record scope, command, time, browser, and environment identifier without secrets in `run-summary.json`.
3. Execute the configured command. Save complete stdout/stderr to `runner.log` when supported; preserve exit code and report/trace paths. Do not alter code before classifying initial failures. Never fabricate a log when capture is unavailable.
4. Classify each failure as **Test Script / Automation Problem**, **Genuine Application Bug**, **Environment / Test Data / Infrastructure**, or **Unknown**. Use the reference rules; a nonzero result alone does not prove a script issue.
5. For script-problem candidates, put only failing tests and bounded/redacted evidence excerpts in `healing-handoff.json`. Return its path and a short status to the orchestrator; do not paste full logs/traces into its context. The orchestrator immediately invokes the healer. Then read `healing-result.json` and retest only affected specs. Allow at most two heal-and-retest cycles per failure. A healing change invalidates the automation approval; the healer records this with `qe-state.js invalidate <project> automation heal-playwright-automation`, and re-review plus `/automation:approve` are required afterward.
6. Do not route genuine application bugs to healing to alter the test. Preserve reproduction, expected vs observed behavior, evidence paths, and linked scenario/requirement in the run summary. Environment/data/infrastructure blockers are not app bugs; do not weaken tests to bypass them.
7. When requested/appropriate, run `npx playwright test <file> --repeat-each=3` for healed specs and record observed iteration results. Do not claim stability if it was not run or any iteration failed.
8. Update `run-summary.json` using the format in `agent-handoff-standard.md`. `counts` stays the initial run's runner-reported totals. Each targeted retest goes in `retests[]` (attempt 1 or 2) and each healed test in `healedTests[]` with its changed files, exact change, and observed retest result. Then run `qe-state.js execution`; it rejects summaries that mark an application bug as healed, exceed two retests per spec, or omit healed-test details. Update traceability with observed run facts only. Never replace the initial failure with only the final green result.
9. Return a concise response (status/counts, summary path, failure classifications, blocker). The orchestrator reads the summary first and opens only relevant referenced evidence.

## Required contents of `run-summary.json`

The following detailed sections belong in the run artifact, not the agent's final chat response. Keep the final response to status/counts, summary path, failure classifications, and blockers.

### Run Summary
- Project, scope, environment/browser, command, start/end time.
- Total / passed / failed / skipped / timed out counts as reported by the runner.
- Overall status: Passed, Failed, Partially Passed, or Blocked.

### Failures and Classification

| Test | Classification | Evidence / Root Cause | Status |
|---|---|---|---|

### Healed Tests

| Test | Files / methods changed | Healing detail | Post-heal rerun result |
|---|---|---|---|

Write “None” if no tests were healed. Never claim a test healed unless a change was actually made and verified in the working tree.

### Application Defects
List defect reproduction steps, expected vs observed results, evidence, and linked scenario IDs; otherwise write “None identified.”

### Stability Verification
List each `npx playwright test <file> --repeat-each=3` command and the observed per-run result, or state not run and why.

### Artifacts and State
Report trace/report paths, traceability/state updates, approval invalidations, unresolved blockers, and limitations.

## Guardrails

- Do not change tests or application code before collecting and classifying initial failure evidence.
- Never mask a genuine app bug by weakening/removing assertions, changing expected values, adding sleeps/force clicks, or suppressing errors.
- On script problems, delegate immediately to Heal Playwright Automation; do not independently patch around it.
- Do not rerun the entire suite unnecessarily; rerun the affected scope and clearly separate initial and follow-up results.
- Do not claim success based on a command launch, partial output, or one rerun. Use observed runner summaries and exit codes.
- Preserve test artifacts/reports needed for diagnosis; do not delete existing test state/output without explicit authorization.
- Use `.gemini/tools/helpers/qe-state.js` for compact state reads and record the verified run with `execution <project> output/<project>/.qe/runs/<run-id>/run-summary.json automated-test-execution`; never edit `qe-state.json` directly. Running tests is not approval. A healed code change invalidates approval tied to the previous artifact version.
- Use `.gemini/tools/helpers/qe-files.js` for bounded text reads/writes and `.gemini/skills/_shared/references/deterministic-tools.md` for limits. Keep full logs and traces in run artifacts, not chat.
