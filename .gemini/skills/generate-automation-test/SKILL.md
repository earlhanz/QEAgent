---
name: generate-automation-test
description: Generate production-ready Playwright UI or API tests in TypeScript from approved QE scenarios, manual tests, designs, OpenAPI specs, Postman collections, or DOM/page snapshots. Use only after analysis and manual-test human approval gates are satisfied.
---

# Generate Playwright Automation Test

## Purpose

Transform approved QE scenarios and source-backed manual cases into maintainable Playwright TypeScript automation that follows the project architecture. UI automation uses a fixtures-first Page Object Model. API tests use reusable API clients/fixtures where appropriate.

## Trigger and gate conditions

Use when asked to create or update Playwright UI/API test automation in TypeScript. Do not use this skill to review existing automation; route that to `automated-test-reviewer`.

Before implementation, run `node .gemini/tools/qe-workflow.js check-approved manual_tests <project>`; it also verifies analysis. Both gates must be approved, with their artifacts unchanged since approval. The target scenario must be marked as an automation candidate in the approved QE strategy/traceability register, and its manual case must be approved. If a gate, scenario, or approval is missing/stale, stop and explain the required next action. Never start a downstream phase on inferred approval.

Expected behavior comes from the approved design and scenarios derived from it. User stories or requirements may clarify requested scope but must not add behaviors absent from the approved design. Record conflicts and gaps rather than inventing expected outcomes.

## Automation location

Automation deliverables live in the project automation root, `output/<project>/automated tests/` (`artifacts.automation.path` in state; the phase fingerprint and gate hook cover this path). Treat that folder as the Playwright project root. Inside it, use `src/pages/`, `src/components/`, `src/fixtures/`, `tests/`, and its own `playwright.config.ts`, unless an inspected existing automation project already sits at that path with equivalent conventions. Do not write automation into another repository location: those files would not be reviewed, fingerprinted, or approved. Quote the path in shell commands because it contains a space.

## API sources

For API-layer scenarios, read `references/playwright-api-standards.md` first. API sources (OpenAPI specs, Postman collections) belong in `docs/<project>/design/api/`. A collection's saved example responses are not expected behavior unless the design or an OpenAPI spec confirms them. Use `node .gemini/tools/helpers/qe-api.js outline|show` to inspect large collections without loading them whole. Never copy environment-file values, tokens, or credentials into tests or data.

## Required workflow

1. **Gather focused context.** Read only the selected project's approved QE strategy, target scenario rows in `docs/<project>/traceability-matrix.xlsx`, linked design sections, approved manual cases, relevant test data, and project files needed for implementation. Read shared state/privacy guardrails.
2. **Preflight the codebase.** Identify Playwright and TypeScript versions, package manager, `playwright.config.ts`, scripts, existing specs, page objects, components, fixtures, API clients, authentication/storage state, CI conventions, environment/data setup. Read `references/project-stack-conventions.md`. Reuse suitable existing conventions; do not duplicate abstractions.
3. **Resolve feasibility.** Map each approved scenario/manual step to test assertions. Identify UI/API layer, prerequisites, data, auth, dependencies, and deterministic setup. Call `test-data-generator` for needed synthetic data under `output/<project>/testdata/automation/`; update traceability. Ask focused questions only when blocked.
4. **Map locators and contracts.** For UI, follow `references/playwright-architecture-and-locators.md`; verify against supplied DOM/page snapshots or inspected source. For API, map each request to the operation in `design/api/` that defines it, then follow `references/playwright-api-standards.md` (typed clients in `src/api/`, fixtures, specs in `tests/api/`). Never invent selectors, endpoint paths, payloads, status codes, or expected results.
5. **Plan minimal changes.** Reuse existing abstractions. Inside the automation root, add or modify UI interaction classes under `src/pages/`, widgets under `src/components/`, dependency injection under `src/fixtures/`, and specs under `tests/`, unless inspected conventions establish equivalents. Keep assertions in `.spec.ts` only.
6. **Implement through fixtures.** Register page objects/components as custom fixtures and inject them into specs. Never instantiate a page object in a `.spec.ts` with `new PageObject(page)`. Pages/components contain interactions, not `expect()` calls.
7. **Ensure isolation.** Tests must be independent and safe under `fullyParallel: true`. Prefer API setup with `APIRequestContext` over UI setup when supported. Do not change global config without inspecting current behavior and an explicit need; report any existing config limitation.
8. **Self-review and verify.** Follow `references/playwright-sync-and-isolation.md` and the checklist below. Inspect diffs, architecture, types/imports, traceability, and prohibited patterns. Run project-approved typecheck/lint/test commands only when within the requested scope; report actual commands/results. Do not claim runtime verification otherwise.
9. **Update traceability and state.** Add/update scenario → manual test → automated test IDs/paths in the workbook, preserving data. Update `qe-state.json` with verified generated file paths and implementation status, not pass status unless execution results were observed. Follow shared state guardrails.
10. **Offer virtualization before final review.** If the approved strategy identifies a need, ask at the end of test creation whether the user wants virtualization. Do not create it without an explicit yes. On yes, hand off to `service-virtualizer` under `output/<project>/automationservice/`; it records `automation_service` as `completed`. On no, or when the strategy says virtualization is not recommended, run `node .gemini/tools/helpers/qe-state.js artifact <project> automation_service not_applicable generate-automation-test`. The validator refuses to prepare automation until this decision is recorded.
11. **Review loop and human gate.** Invoke `automated-test-reviewer` over the automation and any accepted virtualization artifacts; revise findings and repeat review. Record `qe-state.js artifact <project> automation completed generate-automation-test` once files exist. The reviewer saves its report and records reviewer status. When it is ready and all artifacts and traceability are saved, run `node .gemini/tools/qe-workflow.js prepare automation <project>` to fingerprint the review version, including the workbook. Present it and stop. `/automation:feedback <project> <comment>` reopens and invalidates approval; only `/automation:approve <project>` approves the presented version through validator checks.

## Required architecture rules

- **Fixtures-first POM:** UI interactions in `src/pages/`; reusable widgets in `src/components/`; custom dependency injection in `src/fixtures/`; specs in `tests/`. Follow equivalent established project paths when present.
- **Assertions:** All Playwright `expect()` assertions belong in `.spec.ts` files. Pages/components expose actions and locators only.
- **Locator hierarchy:** Prefer, in exact order: `getByRole()` → `getByLabel()` → `getByPlaceholder()` → `getByText()` → `getByTestId()`. CSS and XPath are prohibited unless no suitable user-facing/test-id locator exists and the reason is documented.
- **Synchronization:** Use auto-waiting and web-first assertions (for example `await expect(locator).toBeVisible()`). Never use `page.waitForTimeout()` or hard sleeps.
- **Isolation:** Tests must be independent and safe under full parallel execution. Prefer API setup with `APIRequestContext`; clean up owned data and avoid shared mutable records.
- **TypeScript:** Use explicit useful types and await Playwright operations. Do not use `any` to bypass type problems.

## Reference materials

Follow `references/playwright-architecture-and-locators.md`, `playwright-sync-and-isolation.md`, and `playwright-code-templates.md`; for API scenarios, also `playwright-api-standards.md`. Also consult `project-stack-conventions.md` and shared traceability, privacy, and state guardrails.

## Self-verification checklist

- [ ] Analysis and manual approval gates are current; target scenario is approved for automation.
- [ ] Every test maps to approved scenario/manual case IDs and design evidence.
- [ ] Existing framework was inspected; no duplicate page object/fixture was created.
- [ ] Locators follow priority; every CSS/XPath use has a documented reason.
- [ ] No `expect()` exists in page/component code; assertions are in specs.
- [ ] Specs receive page objects/components through custom fixtures; no direct POM construction in specs.
- [ ] No `page.waitForTimeout()` or hard sleeps exist.
- [ ] Tests own isolated setup/data/cleanup and are safe for `fullyParallel: true`.
- [ ] API setup uses `APIRequestContext` where appropriate and supported.
- [ ] API tests cite their `design/api/` operation; status codes and fields are design- or spec-backed, not taken from a Postman example alone; no tokens, keys, or environment values are hard-coded.
- [ ] Types/imports are coherent; behavior and assertions are source-backed.
- [ ] Traceability and project state reflect verified artifacts; execution is not inferred.
- [ ] Reviewer findings are resolved or reported; human approval remains pending.
- [ ] Service virtualization was created only after explicit user approval.

## Output

Report covered scenario IDs, changed paths, data/traceability changes, reviewer status, commands/results actually observed, remaining risks, virtualization choice, and that automation awaits human approval.

## Deterministic helper requirements

Use `.gemini/tools/helpers/qe-files.js` for bounded text reads/writes, `qe-data.js` for reproducible synthetic datasets when the sourced schema is supported, and `qe-state.js` for project-state updates. Use spreadsheet tooling for traceability workbooks. Follow `.gemini/skills/_shared/references/deterministic-tools.md`; do not edit `qe-state.json` directly or dump complete source files into the response.
