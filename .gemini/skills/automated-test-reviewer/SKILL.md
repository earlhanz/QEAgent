---
name: automated-test-reviewer
description: Review Playwright TypeScript automation for coverage of approved QE scenarios, correct design-backed assertions, architecture and locator standards, reliability, data safety, virtualization fidelity, and diagnostic value. Use after Generate Automation Test creates or updates automated tests; does not modify or execute tests unless asked.
---

# Automated Test Reviewer

## Trigger and boundaries

Use this skill to review automation in `output/<project>/automated tests/`, plus any user-approved virtualization in `output/<project>/automationservice/` and automation datasets in `output/<project>/testdata/automation/`. Route new coverage or fixes to `generate-automation-test`. Do not modify tests, the workbook, or state beyond recording your review. Do not execute tests unless the user asks; never infer a pass from code review.

## Required inputs

Read only the selected project's: approved strategy (sections 5–9), the scenario IDs in scope from `strategy/test-scenarios.json`, the cited design sections, the approved manual cases those tests implement, the automation code and its config, automation datasets and manifests, virtualization artifacts, and the workbook rows for those scenarios. Use bounded reads with `qe-files.js`. If an input is missing or unreadable, say so and limit the review accordingly.

## Review workflow

1. Confirm the gates with `node .gemini/tools/qe-workflow.js check-approved manual_tests <project>`. If upstream approval is stale, stop and report it.
2. For each automated test, check the items in `references/automation-review-checklist.md` against these standards (do not duplicate them here):
   - `../generate-automation-test/references/playwright-architecture-and-locators.md`: fixtures-first POM, no `new PageObject(page)` in specs, no `expect()` in pages/components, locator priority, documented CSS/XPath exceptions.
   - `../generate-automation-test/references/playwright-sync-and-isolation.md`: no `waitForTimeout`/sleeps, web-first assertions, independent and `fullyParallel`-safe tests, `APIRequestContext` setup, cleanup.
   - `../generate-automation-test/references/playwright-api-standards.md` for API tests: typed clients without `expect()`, exact documented status codes, design- or spec-backed fields (not Postman examples alone), `baseURL` and auth from the environment, owned data and cleanup.
   - `../_shared/references/privacy-test-data.md`: no secrets or real personal data.
3. Verify every assertion's expected value traces to the cited design or contract and the approved manual case. Flag invented selectors, endpoints, payloads, or expected results.
4. If virtualization exists, confirm the user agreed to it, it follows `../service-virtualizer/references/virtualization-guidelines.md`, interception is narrowly scoped and resettable, and the remaining real-service coverage is stated.
5. Compare workbook links (scenario → manual → automation → data) with the code. Report missing or stale links; do not edit the workbook.
6. Save the complete report to `docs/<project>/reviews/automation-test-review.md`: scope, inputs read, findings table (`ID | Severity | File:line | Finding | Evidence | Correction`), coverage notes, limitations, and a verdict (Ready / Ready with changes / Needs rework). Finish the report before recording status, because the helper hashes it.
7. Record status: `node .gemini/tools/helpers/qe-state.js reviewer <project> automation <ready|needs_changes> automated-test-reviewer docs/<project>/reviews/automation-test-review.md`. `needs_changes` returns the phase to `generate-automation-test`; rerun this review after the edits.
8. When ready, run `node .gemini/tools/qe-workflow.js prepare automation <project>`. It also requires the virtualization decision to be recorded. Present the version and stop. Only `/automation:approve <project>` approves; `/automation:feedback <project> <comment>` reopens.

Severity levels match `manual-test-reviewer` (Critical: could produce a false pass or miss a core flow; High; Medium; Low; Info). Follow `.gemini/skills/_shared/references/deterministic-tools.md`. Return only the verdict, finding counts by severity, the report path, and blockers.
