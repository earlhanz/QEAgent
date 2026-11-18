---
name: heal-playwright-automation
description: Diagnose and surgically fix failing existing Playwright TypeScript tests using run output, traces, DOM snapshots, and source code. Use for debugging or healing existing tests, not for generating new test coverage.
---

# Heal Playwright Automation

## Purpose and routing boundary

Diagnose failing Playwright TypeScript tests and apply minimal, evidence-based test-code fixes without masking genuine product defects or weakening coverage. Route requests to create new tests or new coverage to `generate-automation-test`; route code-quality reviews without a failure to `automated-test-reviewer`.

## Mandatory triage gate

Before changing any code, classify the failure into exactly one primary category:

1. **Broken Locator** — the UI element's accessible role/name, label, placeholder, text, or approved test ID changed or is incorrectly mapped.
2. **Timing / Race Condition** — asynchronous rendering, navigation, or response timing is not synchronized with a meaningful condition.
3. **Test Data / State Issue** — expired auth/storage state, dirty or missing data, environment mismatch, or parallel-worker collision.
4. **Genuine Application Bug** — observed application/API behavior violates the approved design, contract, or expected result.

If evidence is insufficient, do not guess or patch. Gather the missing trace/DOM/run evidence or report the cause as undetermined while retaining the closest category as provisional. If the evidence indicates **Genuine Application Bug**, stop all healing edits. Report the defect and reproduction details; do not weaken assertions, alter expected results, or modify tests to make it pass.

## Required inputs and preflight

The orchestrator may provide a path to `healing-handoff.json`. Read that file first, then inspect only the referenced spec, relevant page/component/fixture, approved strategy/scenario/design, and evidence needed to classify the failure. Keep complete logs and traces in the run folder; do not paste them into the orchestrator's context. If called directly, gather the failing command/output or stack trace and create/use the same run-scoped handoff pattern. Inspect repository diff/status before editing. If a key artifact is unavailable, state the limitation and continue diagnosis only where supported.

Use the project's assigned Playwright/TypeScript version and existing commands. Do not expose secrets from logs or state files. Read the shared project-state guardrails if a project state update will be needed.

## Diagnostic and healing workflow

1. Parse the error, identify the failing action/assertion, exact test and line, environment/browser, and whether the failure is repeatable or isolated.
2. Classify it using the four categories above **before any code edit**. Consult `references/playwright-failure-decision-matrix.md`.
3. Inspect the failing spec and linked Page Object/Component/Fixture. Inspect the Playwright trace or current DOM/API evidence when available. Compare observed behavior with the approved design/contract and test intent.
4. If it is a genuine application bug, stop and report; do not patch test or app code under this healing skill. If evidence is inconclusive, stop before edits and request/gather targeted evidence.
5. For a test defect, make the smallest local correction. Preserve the scenario, meaningful assertions, intended coverage, and existing architecture. Locator repairs belong in Page Objects/Components, never directly in `.spec.ts`; assertions remain in `.spec.ts`.
6. Follow existing locator priority and synchronization standards in `../generate-automation-test/references/playwright-architecture-and-locators.md` and `playwright-sync-and-isolation.md`. Never introduce fixed sleeps, forced clicks, or unapproved brittle selectors.
7. Review the diff to confirm only the diagnosed broken line/method and necessary related traceability/state fields changed. Do not refactor unrelated code.
8. Provide the stability verification command: `npx playwright test <file> --repeat-each=3` (substitute the actual failing spec path). Run it only if execution is within the user's requested scope and environment is available; otherwise provide it as the next verification step and state it was not run.
9. If a fix is made, invalidate the automation approval with `node .gemini/tools/helpers/qe-state.js invalidate <project> automation heal-playwright-automation`, and update traceability only as applicable. Record implementation separately from test execution; only report observed run results. Update project state under shared guardrails.
10. Write a concise `healing-result.json` beside the run summary using `.gemini/skills/_shared/references/agent-handoff-standard.md`. Include classification, status, root cause, changed paths, change summary, evidence paths, and approval invalidation. Do not include reasoning transcripts or duplicate full logs. The executor uses this file to retest only affected specs.

## Context-efficient response

Return only the classification/status, a one-line root cause or blocker, changed paths, the `healing-result.json` path, and the recommended retest command. Keep the detailed facts in the handoff file; never return full stack traces or full reports to the orchestrator.

## Architectural guardrails

- Preserve the existing Fixtures-first POM: pages in `src/pages/`, widgets in `src/components/`, dependency injection in `src/fixtures/`, specs in `tests/` (or inspected equivalent project conventions).
- Page Objects/Components contain interaction and locator logic only. All `expect()` assertions stay in `.spec.ts` files.
- Fix locators inside the owning Page Object/Component, not inline in the spec.
- Apply locator order exactly: `getByRole()` → `getByLabel()` → `getByPlaceholder()` → `getByText()` → `getByTestId()`. CSS/XPath only with evidence that higher-priority choices are not viable and a documented reason.
- Use web-first assertions/Playwright auto-waiting. Ban `page.waitForTimeout()`, hard sleeps, `{ force: true }` clicks, assertion deletion/weakening, and retry inflation.
- Make only surgical edits. Do not rewrite working tests, refactor unrelated files, or change application behavior under a test-healing task.

## Output format

### Root Cause Summary
State the observed failure and concise evidence.

### Classification
Choose one of the four categories. Mark provisional if evidence is incomplete.

### Files Modified
List paths, or state “None” for diagnosis-only/application-bug cases.

### Fix or Defect Report
Describe the surgical fix and why it preserves intent, or provide app bug reproduction details (preconditions, steps, expected vs observed behavior, environment, evidence).

### Stability Verification
Provide `npx playwright test <file> --repeat-each=3` and state whether run; include only observed results.

### Remaining Risk / State
Note unresolved evidence, approval invalidation, and project-state/traceability update result as applicable.

## References

- `references/playwright-failure-decision-matrix.md` — common errors, evidence, category, and safe fix patterns.
- `references/healing-anti-patterns.md` — prohibited masking/flakiness patterns and review checks.
- Reuse `../generate-automation-test/references/playwright-architecture-and-locators.md` and `playwright-sync-and-isolation.md` for shared standards; do not duplicate them.
- Use `.gemini/tools/helpers/qe-files.js` for bounded project text access/writes and `.gemini/tools/helpers/qe-state.js` for state updates; follow `.gemini/skills/_shared/references/deterministic-tools.md`.
