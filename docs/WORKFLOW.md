# QEAgent Human-Gated Workflow

## Start and select a project

- New project: run `/qe:create <project>`. It creates `docs/<project>/` and `output/<project>/`, the state file, and a copy of the traceability workbook template. Add source documents to `docs/<project>/design/` (required), `user-story/`, and `requirements/`. Put OpenAPI specs and Postman collections in `docs/<project>/design/api/`. They then count as design, and changing one reopens analysis approval. A Postman example response is only an observed sample unless the design or a spec confirms it. Never add Postman environment files.
- Select context: run `/qe:start <project>`. This loads only that project's state and relevant sources and prunes checkpoint markers proven complete, cancelled, superseded, or stale.
- Begin strategy analysis: run `/analysis:start <project>`. The analysis command prepares a review version; it does not approve it.

## Phases and gates

| Phase | Prerequisites (enforced by `qe-workflow.js`) | Saved evidence | Human decision | Unlocks |
|---|---|---|---|---|
| 1. Analysis | Strategy, `strategy/test-scenarios.json`, a design source, traceability workbook | The strategy and scenario register (the human reviews them directly) | `/analysis:feedback <project> <comment>` or `/analysis:approve <project>` | Manual tests |
| 2. Manual tests | Analysis approved and unchanged; manual cases; reviewer `ready` with an unchanged report | `docs/<project>/reviews/manual-test-review.md` | `/manual:feedback <project> <comment>` or `/manual:approve <project>` | Automation |
| 3. Automation | Analysis and manual approved and unchanged; automation code; virtualization decision recorded; reviewer `ready` with an unchanged report | `docs/<project>/reviews/automation-test-review.md` | `/automation:feedback <project> <comment>` or `/automation:approve <project>` | Execution on request |
| 4. Execution | Explicit user request; `check-approved automation` passes | `output/<project>/.qe/runs/<run-id>/run-summary.json` | Read results; execution never approves anything | — |

1. **Analysis:** QE-Architect reviews the selected project's documents and creates `strategy/QE-strategy.md` and `strategy/test-scenarios.json`, and updates both workbook sheets. Expected behavior and scenario outcomes come from design documents only. Requirements and user stories clarify scope and point to gaps but cannot add behavior absent from design. The strategy states whether service virtualization is recommended. `prepare analysis` fingerprints it; stop for human approval.
2. **Manual tests:** Generate detailed manual cases only from approved scenarios and design, with required synthetic data in `output/<project>/testdata/manual/` and updated traceability. Generate Manual Test and Manual Test Reviewer iterate until the reviewer is ready. The reviewer saves its report and records status and the report hash with `qe-state.js reviewer`. `prepare manual_tests` fingerprints the cases, manual data, workbook, and report.
3. **Automation:** Generate Playwright UI and API tests in `output/<project>/automated tests/` (API tests follow `playwright-api-standards.md`: typed clients in `src/api/`, specs in `tests/api/`) only for strategy-approved automation candidates, using approved manual cases and project conventions, with data in `output/<project>/testdata/automation/`. At the end of test creation, if strategy recommends virtualization, ask the user. On yes, create it under `output/<project>/automationservice/` and record `automation_service` completed. On no, or when not recommended, record `not_applicable`. The reviewer then reviews the final code, data, and virtualization; `prepare automation` fingerprints all of it with the workbook and report.
4. **Execution:** On an explicit request, the Playwright Test Executor runs the approved scope and classifies each failure. For a script problem, the orchestrator immediately invokes Heal Playwright Automation, then calls the executor again on the affected spec. At most two heal-and-retest cycles per failure. Genuine application bugs remain failures. The run summary keeps initial counts, every retest, and every healed test with its exact change. A healing change invalidates the automation approval, so re-review and `/automation:approve` follow.

## Deterministic gate rules

- A human approval applies to one artifact version. `approve` records `phase_fingerprint`, the hash of that phase's own artifacts. Any later change to them makes the approval stale for downstream checks. Later-phase rows added to the shared workbook do not.
- Feedback is not approval. `reopen` clears the phase's approval, prepared version, and reviewer evidence, and resets downstream gates that were in review or approved.
- Reviewer skills save evidence under `docs/<project>/reviews/`, call `qe-state.js reviewer`, then `qe-workflow.js prepare`. A reviewer cannot record a review on an approved phase; reopen it first. A report edited after recording forces a new review.
- Approval commands run `qe-workflow.js approve`. It rechecks required files, saved review, readiness, upstream approvals, and the gate fingerprint (phase files + workbook + report) before advancing.
- Execution and downstream generation use `qe-workflow.js check-approved <phase> <project>`.
- State changes go only through `.gemini/tools/helpers/qe-state.js`. Direct edits to `qe-state.json` are not approval evidence.

## Project sources and traceability

- `Traceability` links design and requirements to manual tests and data. `Scenario Register` links design to scenarios, manual cases, automation, and test data. Join them on Manual Test Case ID and Design ID. Keep stable IDs and paths; leave unknown links blank and explain gaps.
- The scenario register JSON format and workbook editing rules are in `.gemini/skills/_shared/references/traceability-standard.md`. Editing the `.xlsx` needs a spreadsheet capability the project owner installs; without one, the update is reported as blocked.
- Each project owns its `docs/<project>/qe-state.json`; it is a progress index, not requirements or evidence.

## Compact execution records and checkpoints

- Agent handoffs use `.gemini/skills/_shared/references/agent-handoff-standard.md`. Pass a bounded run-artifact path and concise task facts rather than transcripts or full logs.
- Each execution uses `output/<project>/.qe/runs/<run-id>/`. Read `run-summary.json` first; raw runner logs stay in `runner.log`.
- `/qe:checkpoint <project>` replaces the prior snapshot: up to five current tasks and five next actions, capped at 2,000 bytes. The helper rejects unknown fields and out-of-project paths.
- Restart or compression: `/qe:continue <project>` reloads only the selected project's state and specific work context. Gemini CLI has no post-compression hook. Its optional file checkpointing (`general.checkpointing.enabled`, then `/restore`) restores files and conversation, but is separate from QEAgent state.

## Enforcement boundary

| Mechanism | Enforces | Does not enforce |
|---|---|---|
| `qe-workflow.js` | Approval prerequisites, fingerprints, upstream currency, virtualization decision | Quality or correctness of the content |
| `qe-state.js`, `qe-project.js`, `qe-files.js`, `qe-data.js`, `qe-api.js` | Slug/path containment, symlink rejection, size bounds, no-overwrite defaults, checkpoint and run-summary shape | Product semantics |
| BeforeTool hook (`phase-gate.js`) | Blocks `write_file`/`replace` on `qe-state.json` and gated output writes it can see in tool arguments, including helper commands | Writes made indirectly by scripts or outside Gemini; it fails open if it crashes |
| `GEMINI.md`, skills, commands | Model guidance: design-only behavior, review loops, asking before virtualization, compact handoffs | Anything deterministic |

Official references (recheck when upgrading Gemini CLI): [configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md), [hooks](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md), [custom commands](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md), [skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/creating-skills.md), [subagents](https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md), [checkpointing](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/checkpointing.md).
