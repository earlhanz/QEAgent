---
name: service-virtualizer
description: Design and implement deterministic mocks, stubs, fakes, or service virtualization for automated tests when QE strategy identifies a dependency need and the user agrees to create it.
---

# Service Virtualizer

## Purpose and trigger

Use this skill to isolate an external or internal service dependency for a specific approved automation scenario. The orchestrator invokes it only when the approved QE strategy recommends virtualization and the user explicitly says yes after automation tests are drafted. Do not create virtualization as a default, or during analysis.

## Required inputs

Confirm the selected project, approved strategy and scenario IDs, dependent service/interface, available contract evidence (API schema, examples, consumer code, or explicit user-provided behavior), test framework, local conventions, and the user's approved scope. If the service contract is unknown, ask for evidence or create a clearly labeled proposal without pretending it is implemented.

## Workflow

1. Read only the selected project's approved strategy sections, target scenarios, automation code, project conventions, and the references below.
2. Identify the dependency boundary, protocol, relevant request/response fields, success and error conditions, state behavior, latency/failure behavior needed by scenarios, and what must still be verified against a real service. Do not add unsupported contract behavior.
3. Prefer the smallest deterministic mechanism already supported by the project: Playwright route interception for browser requests, an existing mock server or contract tool for API tests, or a documented local fake. Avoid adding a new dependency without a documented need.
4. Create only the approved virtualized behaviors under `output/<project>/automationservice/`. Keep configuration and fixtures reusable, scenario-named, resettable between tests, and free of credentials or real personal data.
5. Connect the virtualized behavior to the relevant automated tests through the project's existing fixtures/setup. Keep real-service integration tests identifiable and separate; mocks cannot prove real integration.
6. Update the existing traceability workbook with scenario IDs and virtualization artifact paths. After files exist, record `node .gemini/tools/helpers/qe-state.js artifact <project> automation_service completed service-virtualizer output/<project>/automationservice/`. If automation is awaiting human approval, any virtualization change requires a fresh automation review and fingerprint.
7. Summarize created paths, covered scenarios, contract evidence, simulated behaviors, limitations, and any real-service tests still needed.

## Guardrails

- Never create or change service virtualization without an explicit yes from the user. If the user declines, record it with `qe-state.js artifact <project> automation_service not_applicable generate-automation-test` and continue the automation review without it.
- Do not fabricate endpoints, payloads, response codes, schemas, or timing requirements. Distinguish contract evidence from assumptions and questions.
- Do not claim a virtual service validates the real dependency. Preserve at least the integration coverage needed to detect contract drift.
- Keep test state isolated and deterministic. Reset in-memory state per test or worker; prevent parallel tests from sharing mutable fixture state.
- Never hide genuine application or service defects by intercepting all traffic or returning unconditional success. Make interception scope specific and observable.
- Follow existing security, data-privacy, test architecture, and review standards.

## References

Read `references/project-tooling.md` and `references/virtualization-guidelines.md` when applicable. Also follow `../_shared/references/traceability-standard.md`, `privacy-test-data.md`, `project-state-guardrails.md`, and `deterministic-tools.md`.
