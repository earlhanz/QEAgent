# Agent Handoff and Compact Reporting Standard

## Purpose

Keep orchestrator context small while preserving enough evidence to audit execution and healing. Agents communicate through a small, run-scoped handoff file and a concise final response. Raw logs and full reports stay in the selected project's output files; never paste full logs or transcripts into another agent's prompt.

## Run directory

For each execution request, create a unique run ID using UTC time plus a short random suffix, for example `20261118T143000Z-a1b2`. Use:

`output/<project>/.qe/runs/<run-id>/`

Store only artifacts produced for that run there. Do not overwrite or append to a project-wide permanent log. Do not delete previous run directories as part of a new run.

Recommended files:

- `runner.log` — complete stdout/stderr, when the execution environment supports capture.
- `run-summary.json` — compact counts, command, status, timestamps, and artifact paths.
- `healing-handoff.json` — only when one or more failures are classified as test-script problems.
- `healing-result.json` — healer's concise diagnosis and changes for the executor to retest.
- Playwright report, trace, screenshot, or DOM snapshot files when produced/configured.

If output capture is not supported, do not fabricate a log. Record the available evidence and limitation in the summary.

## Context budget rules

- Keep each JSON handoff under 12 KB and the agent's final response under 1,000 characters, excluding required structured fields if the platform enforces a schema.
- Include only failed tests in the healing handoff. Keep each error excerpt under 4 KB or 30 lines; redact secrets and irrelevant stack frames.
- Prefer paths and concise facts over pasted file contents. The receiver reads only the referenced evidence needed for the task.
- Never include full passing-test output, full stack traces, full reports, or agent reasoning in the orchestrator response.
- Do not maintain an unbounded append-only chat log. Run files are immutable evidence for one run; summaries replace their own file only when that same run is updated after retest.

## `run-summary.json` format

```json
{
  "schemaVersion": 1,
  "runId": "20261118T143000Z-a1b2",
  "project": "sampleprojectname",
  "scope": ["tests/orders.spec.ts"],
  "command": "npx playwright test tests/orders.spec.ts",
  "environment": "staging",
  "browser": "chromium",
  "startedAt": "2026-11-18T14:30:00Z",
  "finishedAt": "2026-11-18T14:31:12Z",
  "status": "failed",
  "counts": {"total": 8, "passed": 6, "failed": 2, "skipped": 0},
  "failures": [
    {"test": "orders.spec.ts creates order", "class": "script", "evidence": "TimeoutError at tests/orders.spec.ts:42", "healingStatus": "healed_passed"},
    {"test": "orders.spec.ts rejects zero quantity", "class": "application", "evidence": "Order accepted; design orders.md#validation requires rejection", "healingStatus": "not_applicable"}
  ],
  "retests": [
    {"spec": "tests/orders.spec.ts", "attempt": 1, "command": "npx playwright test tests/orders.spec.ts --grep \"creates order\"", "counts": {"total": 1, "passed": 1, "failed": 0}, "finishedAt": "2026-11-18T14:40:02Z"}
  ],
  "healedTests": [
    {"test": "orders.spec.ts creates order", "filesChanged": ["src/pages/orders.page.ts"], "change": "submitOrder() now waits for the confirmation status role instead of clicking before render", "retestResult": "passed (attempt 1)"}
  ],
  "artifacts": {"log": "runner.log", "report": "playwright-report/", "trace": "test-results/.../trace.zip"}
}
```

Use observed values only. Omit unavailable fields or set them to `null`; never guess counts, environment, or artifact paths.

- `runId` must equal the run folder name. `counts` is the **initial** run's runner-reported totals and is never overwritten by retests.
- `failures[].class`: `script`, `application`, `environment`, `unknown`. `failures[].healingStatus`: `not_applicable`, `pending`, `healed_passed`, `still_failing`, `application_bug_stop`, `blocked`. An `application` failure can never be `healed_passed`.
- `retests[]`: one entry per targeted retest, `attempt` 1 or 2 (two heal/retest cycles maximum per spec), with its command and observed counts.
- `healedTests[]`: every healed test with `filesChanged`, the exact `change`, and the observed `retestResult` (or `not_run`).
- Overall `status`: `passed`, `failed`, `partially_passed`, `blocked`, reflecting the state after retests while initial counts remain visible.

`qe-state.js execution` enforces these rules (and a 256 KiB size limit) before recording a compact index in project state.

## `healing-handoff.json` format

```json
{
  "schemaVersion": 1,
  "runId": "20261118T143000Z-a1b2",
  "project": "sampleprojectname",
  "sourceSummary": "run-summary.json",
  "failures": [
    {
      "test": "orders.spec.ts creates order",
      "specPath": "tests/orders.spec.ts",
      "classification": "provisional_script_problem",
      "errorExcerpt": "TimeoutError: ...",
      "evidencePaths": ["test-results/.../trace.zip"],
      "expectedBehaviorSource": "docs/sampleprojectname/design/orders.md#...",
      "attempt": 1
    }
  ]
}
```

Do not send application, environment, or unknown failures to the healer as if they were script defects. The healer must independently triage against project source/design and may return `stop` when it finds an application bug or lacks evidence.

## `healing-result.json` format

```json
{
  "schemaVersion": 1,
  "runId": "20261118T143000Z-a1b2",
  "results": [
    {
      "test": "orders.spec.ts creates order",
      "classification": "timing_race",
      "status": "fixed_pending_retest",
      "rootCause": "The test acted before the order confirmation became visible.",
      "filesChanged": ["src/pages/orders.page.ts"],
      "change": "Wait on the observed confirmation state through the existing page action.",
      "evidencePaths": ["runner.log", "test-results/.../trace.zip"],
      "approvalInvalidated": true
    }
  ]
}
```

Allowed statuses: `fixed_pending_retest`, `diagnosed_no_change`, `application_bug_stop`, `blocked`. The executor must read this file and retest only the affected scope, then update `run-summary.json` with observed follow-up results and exact healed-test details.

## Agent response contract

For any substantial skill output, save the detailed deliverable in its designated project file and return only a compact handoff. Each agent's final response to the orchestrator contains only:

1. One-line status and counts/result.
2. Handoff/report file path(s).
3. Failed test identifiers and classification, if any.
4. Blocker or user decision needed, if any.

Use the run-scoped JSON files for execution/healing. For analysis, generation, or review work, hand off the designated strategy, test, data, or review artifact path; do not create a separate log just to duplicate that artifact. Put only unresolved decisions and the minimum next-step context in the handoff.

The orchestrator reads the summary first, then opens only the referenced failure evidence or healing result necessary for the next step. The user-facing final report is concise and links the detailed run summary. File handoffs preserve evidence but do not themselves grant phase approval or user approval.
