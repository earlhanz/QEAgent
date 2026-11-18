# Project State Schema

Each project has its own `docs/<project>/qe-state.json`. Create it only with `node .gemini/tools/helpers/qe-project.js create <project>` (new project) or `init-state <project>` (existing docs folder without state); both copy `docs/sampleprojectname/qe-state.json`, substitute the slug, reset progress fields, and never overwrite. The state is a progress index only: it is never a source of product behavior or test evidence.

```json
{
  "schema_version": "1.0",
  "project_id": "sampleprojectname",
  "project_status": "not_started",
  "current_phase": "analysis",
  "phase_gate": {
    "analysis": { "status": "not_started", "artifact_version": null, "reviewer_status": "not_reviewed", "reviewed_artifact_version": null, "review_evidence": null, "review_evidence_sha256": null, "approval": null, "feedback": [] },
    "manual_tests": { "status": "not_started", "artifact_version": null, "reviewer_status": "not_reviewed", "reviewed_artifact_version": null, "review_evidence": null, "review_evidence_sha256": null, "approval": null, "feedback": [] },
    "automation": { "status": "not_started", "artifact_version": null, "reviewer_status": "not_reviewed", "reviewed_artifact_version": null, "review_evidence": null, "review_evidence_sha256": null, "approval": null, "feedback": [] }
  },
  "last_updated": null,
  "updated_by_skill": null,
  "checkpoint": {
    "saved_at": null,
    "saved_by": null,
    "work_in_progress": [],
    "next_actions": []
  },
  "sources_reviewed": [],
  "strategy": {
    "status": "not_started",
    "path": "docs/sampleprojectname/strategy/QE-strategy.md",
    "last_updated": null
  },
  "artifacts": {
    "qe_strategy": { "status": "not_started", "path": "docs/sampleprojectname/strategy/QE-strategy.md" },
    "test_scenarios": { "status": "not_started", "path": "docs/sampleprojectname/strategy/test-scenarios.json" },
    "manual_tests": { "status": "not_started", "path": "output/sampleprojectname/manualtests/" },
    "test_data": { "status": "not_started", "path": "output/sampleprojectname/testdata/" },
    "automation": { "status": "not_started", "path": "output/sampleprojectname/automated tests/" },
    "automation_service": { "status": "not_started", "path": "output/sampleprojectname/automationservice/" },
    "execution": { "status": "not_started", "path": null, "last_run_at": null, "summary": null },
    "traceability": { "status": "not_started", "path": "docs/sampleprojectname/traceability-matrix.xlsx" }
  },
  "decisions": [],
  "open_questions": [],
  "risks_and_blockers": [],
  "notes": []
}
```

Artifact statuses: `not_started`, `in_progress`, `blocked`, `completed`, `not_applicable`. Phase gates use `not_started`, `in_progress` (reviewer recorded ready; not yet prepared), `changes_requested`, `awaiting_human_approval`, and `approved`. Ordered phases are `analysis`, `manual_tests`, `automation`, and optionally `completed`.

Gate fields are written only by helpers:

| Field | Written by | Meaning |
|---|---|---|
| `reviewer_status`, `review_evidence`, `review_evidence_sha256`, `reviewed_artifact_version` | `qe-state.js reviewer` | Saved reviewer report path and SHA-256, plus the phase-artifact fingerprint the reviewer saw. Refused while the gate is `approved`. |
| `artifact_version`, `status: awaiting_human_approval` | `qe-workflow.js prepare` | Gate fingerprint: phase artifacts + traceability workbook + saved reviewer report (analysis has no reviewer report; the human reviews it directly). |
| `approval` `{command, date, artifact_version, phase_fingerprint}` | `qe-workflow.js approve` | `phase_fingerprint` covers only that phase's own artifacts, so later-phase workbook rows do not revoke it; any change to the phase's own files does. |
| `feedback[]` `{date, action, by}` (last 10) | `qe-state.js reopen/invalidate` | Reopening a phase also resets every downstream gate that was in review or approved. |

Phase artifacts used for fingerprints: analysis = strategy, `test-scenarios.json`, and the `design/`, `user-story/`, `requirements/` sources; manual_tests = `manual_tests` path and `output/<project>/testdata/manual/`; automation = `automation` path, `output/<project>/testdata/automation/`, and `output/<project>/automationservice/`. `artifacts.automation_service.status` must be `completed` or `not_applicable` before automation can be prepared or approved; that is the recorded virtualization decision. Record approver only when the user supplies it. Use ISO dates. Keep arrays concise and factual. `sources_reviewed` entries should contain a path and review date; decisions should include decision, status (`proposed` or `approved`), and date. Open questions and blockers should state the missing decision/evidence and impact.

The optional `checkpoint` is a replace-in-place snapshot, not a log. Each `work_in_progress` item is an object `{ "task_id": "stable-short-id", "task": "short description", "status": "in_progress|blocked", "artifact_path": "optional/project/relative/path" }`. Each `next_actions` item is `{ "task_id": "stable-short-id", "task": "short concrete action", "status": "pending|blocked", "artifact_path": "optional/project/relative/path" }`. Keep at most 5 items in each list. Never retain completed tasks. On start, continue, or checkpoint, reconcile markers against authoritative project/artifact state; remove verified completed, cancelled, superseded, or stale tasks. Keep total checkpoint text under 2,000 characters. `saved_at` is an ISO 8601 timestamp and `saved_by` identifies the command/skill (for example `qe-checkpoint`). `qe-state.js checkpoint` rejects unknown fields, duplicate `task_id`s, and `artifact_path` values outside the selected project's `docs/` or `output/` folder.

`artifacts.execution.summary` is a compact index written by `qe-state.js execution` from the run's `run-summary.json`: `run_id`, `status`, `initial_counts`, `retest_count`, `healed_tests`, `application_failures`, `unresolved_failures`. Detailed evidence stays in the run folder.
