---
name: qe-architect
description: Analyze a project's design, user stories, requirements, codebase, and existing test assets to recommend the complete quality engineering and testing strategy. Use for project-wide test planning, test approach definition, testing feasibility analysis, and recommendations for manual, automated, data, integration, performance, security, accessibility, and other testing needs.
---

# QE-Architect

## Purpose

Analyze the project as a whole and create an evidence-based quality engineering strategy and test scenarios that recommend what testing is needed, why it is needed, and how it should be approached. The strategy covers all relevant testing, not automation alone.

This skill defines and documents the strategy. It does not generate a full manual test suite, implement automated tests, generate production-like data, or configure virtual services. Hand those tasks to the corresponding QEAgent skills when requested or when the user continues into implementation.

## Trigger and output

Use when asked to assess project testing needs, define a project QE/test strategy, plan quality activities, or determine whether and how project behavior should be tested.

Save the strategy as a readable Markdown document at `docs/<project>/strategy/QE-strategy.md`. For the starter project, use `docs/sampleprojectname/strategy/QE-strategy.md`. If the user requests another document format, produce that format instead. Create the strategy folder if it does not exist. Preserve and reconcile existing strategy content rather than silently overwriting it.

## Project discovery

Identify the project name, objectives, scope, release context, and user constraints. Review relevant available material from:

- `docs/<project>/design/`, including API sources in `design/api/` (OpenAPI specs, Postman collections). Inspect large API files with `node .gemini/tools/helpers/qe-api.js outline <project> design/api/<file>.json`. A Postman example response is an observed sample, not expected behavior, unless the design or an OpenAPI spec confirms it.
- `docs/<project>/user-story/`
- `docs/<project>/requirements/`
- `docs/<project>/traceability-matrix.xlsx`, when present
- `docs/<project>/strategy/`, for existing strategy documents
- `output/<project>/manualtests/`, `testdata/`, and `automated tests/`, when populated
- The project repository/codebase, where available, for architecture, language, frameworks, interfaces, CI, environments, existing tests, and conventions

Also use documents or constraints provided directly by the user. During behavior and scenario analysis, the supplied design documents are the sole authority for expected behavior. Requirements or user stories may clarify scope, but must not supply additional expected behavior absent from the design. Record conflicts, omissions, and ambiguity as gaps/questions; do not invent or silently reconcile expected behavior. List and read relevant files. Do not imply that an unavailable, empty, unsupported, or unreadable source was assessed. If materials are sparse, create a clearly labeled preliminary strategy and identify missing evidence.

## Analysis workflow

1. Establish project scope, quality goals, user impact, critical workflows, regulatory or privacy constraints, and release risks from available evidence.
2. Build a concise system and quality-risk picture: actors, components, interfaces, data flows, dependencies, critical state transitions, failure impacts, and operational constraints. Separate observed facts from assumptions.
3. Derive test conditions and concrete test scenarios only from the supplied design document. Assign stable scenario IDs and link each to a design location. For API behavior, set `layer: "api"` and cite the operation in `api_ref` (for example `design/api/orders.openapi.json#createOrder` or `design/api/orders.postman_collection.json#Orders/Create order`). Requirements/stories can clarify the requested scope but cannot add behavior. Identify conflicts, ambiguities, untestable statements, and gaps without inventing product behavior.
4. Determine which kinds and levels of testing are relevant to this project. Consider, as applicable:
   - Manual functional and exploratory testing.
   - Unit, component, API/service, integration, contract, UI/end-to-end, and regression automation.
   - Compatibility, cross-browser/device, localization, accessibility, performance/load, resilience/recovery, security/privacy, installation/upgrade, and operational testing.
   - Data quality, migration, backup/restore, and environment/configuration testing.
5. For each recommended test area, explain the project-specific risk or requirement it addresses, suitable scope and depth, timing/layer, evidence or exit criteria, and whether it should be automated, manual, or investigated. Do not recommend every category by default.
6. Assess feasibility, value, dependencies, and cost/maintenance considerations for proposed automation. Inspect existing tools and conventions before recommending tools or frameworks. Mark choices as existing, recommended, or undecided.
7. Define test data and environment needs, access and privacy controls, dependency handling, and service virtualization use. State what virtualized tests cannot prove and where real integration remains necessary.
8. Define quality ownership and workflow: test design/review, execution, CI or release gates where appropriate, reporting, defect triage, risk acceptance, and maintenance. Do not invent owners or organizational commitments.
9. Create a phased roadmap with deliverables and measurable exit criteria. Do not invent dates, staffing levels, budgets, or commitments.
10. Save or update the strategy document. Write stable scenario records to `docs/<project>/strategy/test-scenarios.json` in the format defined in `../_shared/references/traceability-standard.md`. Update both existing sheets in `docs/<project>/traceability-matrix.xlsx`; on a new project, replace the template's placeholder row. Preserve existing content. State in strategy section 9 whether service virtualization is recommended (`yes` with the dependencies and scenario IDs, or `no`). If no spreadsheet capability is available, report the workbook update as blocked and list the intended rows. Record `qe_strategy`, `test_scenarios`, and `traceability` with `qe-state.js artifact <project> <key> completed qe-architect <path>` only after each file is verified. Do not begin manual test generation.
11. After saving the strategy and scenario traceability, run `node .gemini/tools/qe-workflow.js prepare analysis <project>` to record a SHA-256 fingerprint and set `awaiting_human_approval`. Present that version and stop. Feedback via `/analysis:feedback <project> <comment>` revises this phase and invalidates prior approval; prepare the new artifact version for review. Only `/analysis:approve <project>` can unlock the next phase; the command recomputes the fingerprint and validates artifacts before recording approval.
12. Summarize recommendations, gaps, and saved paths. State whether preliminary. Do not imply tests have been implemented or executed.

## Required strategy document structure

# Quality Engineering Strategy — <Project>

## 1. Executive summary
Project quality goals, highest risks, recommended testing direction, and whether the strategy is preliminary or complete enough for planning.

## 2. Scope, objectives, and sources
In-scope areas, quality objectives, sources reviewed with paths/IDs, constraints, assumptions, exclusions, and source limitations.

## 3. System and delivery context
Known architecture, users, critical journeys, interfaces, data flows, environments, dependencies, delivery/CI context, and explicit unknowns.

## 4. Quality risks and test conditions
Risk or quality concern, impacted behavior, source reference, impact/likelihood rationale, and how testing can provide evidence.

## 5. Recommended testing approach

| Test area / layer | What to test | Why it applies to this project | Approach (manual / automated / both) | Priority | Entry or exit evidence |
|---|---|---|---|---|---|

Include only applicable areas. Cover functional and non-functional needs. Identify what remains exploratory or manual and why.

## 6. Test scenarios
| Scenario ID | Design reference | Scenario / condition | Test type or layer | Risk / priority | Data needs | Automation candidate |
|---|---|---|---|---|---|---|

Scenarios are sourced only from the supplied design. Requirements/story context cannot add expected behavior.

## 7. Automation feasibility and direction
Candidate behaviors, suitable layers, existing versus proposed tools, value, feasibility, maintenance concerns, prerequisites, and items that should remain manual or be investigated.

## 8. Test data and environments
Data creation, synthetic data, privacy, isolation, reset/cleanup, environment configuration, credentials handling, and unavailable environment needs.

## 9. Dependencies and service virtualization
External/internal dependencies, contracts, proposed mocks/stubs/fakes/virtual services, behaviors to simulate, fidelity limits, and real-service integration coverage required. End with an explicit line: `Service virtualization recommended: yes (<dependencies, scenario IDs>)` or `Service virtualization recommended: no`.

## 10. Test workflow, reporting, and quality gates
Test design and review, execution flow, CI/release gates where justified, result evidence, defect triage, flake handling, and reporting recommendations. Distinguish current capabilities from proposals.

## 11. Roles and ownership model
Responsibilities by role or team function when supported by project context. Leave assignments open when no owners are known.

## 12. Phased implementation roadmap
Phases, deliverables, dependencies, and measurable exit criteria. No unsupported dates or commitments.

## 13. Traceability and coverage gaps
Coverage relationship between designs, requirements/stories, test conditions, existing manual tests, and proposed testing. Reference the updated `traceability-matrix.xlsx`; include design-to-scenario trace links and report gaps without inventing links.

## 14. Open decisions and next steps
Prioritized questions, missing evidence, decisions required, and recommended next QEAgent skill handoffs.

## Handoffs

- `generate-manual-test`: after `/analysis:approve`, produce detailed manual cases from approved scenarios and their design references.
- `manual-test-reviewer`: review existing manual cases against the sources and strategy.
- `generate-automation-test`: plan or implement selected automation after feasibility, scope, and layer are clear.
- `automated-test-reviewer`: review implemented automated tests against the strategy and sources.
- `test-data-generator`: prepare synthetic scenario data for identified test conditions.
- `service-virtualizer`: design or configure dependency simulations identified by the strategy.

Provide each handoff the strategy section, source references, selected test conditions, assumptions, risks, and constraints it needs.
## Reference materials

Consult these bundled references when applicable:
- Read `references/qe-strategy-template.md` when the task uses that guidance.
- Read `references/test-level-selection.md` when the task uses that guidance.
- Read `references/coverage-model.md` when the task uses that guidance.
- Read `../_shared/references/risk-prioritization.md` when the task uses that guidance.
- Read `../_shared/references/traceability-standard.md` when the task uses that guidance.
- Read `../_shared/references/privacy-test-data.md` when the task uses that guidance.


## Project state tracking

When this task changes project progress or artifacts, use `.gemini/tools/helpers/qe-state.js` for state updates according to ../_shared/references/project-state-guardrails.md and project-state-schema.md. Use `qe-files.js` for bounded source reads and text writes; use spreadsheet tooling for the traceability workbook. Follow `.gemini/skills/_shared/references/deterministic-tools.md`. Do not update state for a read-only review unless project readiness changes or a review deliverable is saved.


