# Project State File Guardrails

The project progress index is `docs/<project>/qe-state.json`. It tracks project state only; it is not a source of product requirements and does not replace the QE strategy, source documents, test artifacts, execution reports, or traceability workbook.

## Update when work changes state
- QE-Architect: record reviewed source paths, strategy status/path, current phase, decisions, open questions, and risks/blockers.
- Generate Manual Test: after test artifact and traceability updates succeed, record artifact status/path and relevant source paths. A failed matrix update must be represented as a blocker or note; do not claim completion.
- Manual Test Reviewer: record review artifact/status only if the review creates a saved deliverable or materially changes project readiness; preserve review limitations. A read-only review may leave state unchanged.
- Generate Automation Test: record implementation status/path only after changes are actually made; record execution separately and only with observed results.
- Automated Test Reviewer: update readiness/review status only when a saved review artifact or material project status change exists.
- Heal Playwright Automation: record only verified targeted edits and observed test execution. A code change invalidates approval tied to the prior automation artifact version; genuine application bugs are reported as blockers/risks without modifying tests to mask them.
- Automated Test Execution: record only observed runner results and execution artifact paths. After a healing change, rerun the affected spec through the executor and distinguish initial from post-heal results. Keep the heal/retest loop to two cycles per failure; genuine application bugs remain failed and are tracked as risks/defects.
- Test Data Generator: record dataset status/path and synthetic-data notes only after generation is saved.
- Service Virtualizer: record virtualization status/path and real-service coverage limitations only after configuration/artifact is saved.

## Safety and accuracy rules
- Read and validate existing JSON before editing. Preserve unknown fields and user-authored content. Make the smallest targeted update; do not replace the whole file with defaults.
- Use `.gemini/tools/helpers/qe-state.js` for compact state reads, artifact status updates, reviewer status updates, reopen/invalidate, execution records, and checkpoints. Fields the helpers do not manage (`sources_reviewed`, `decisions`, `open_questions`, `risks_and_blockers`, `notes`, `strategy`) are guidance only; there is no helper for them yet, so report needed changes instead of hand-editing. The BeforeTool hook blocks `write_file`/`replace` on `qe-state.json`. Report if the helper rejects the requested update.
- Keep entries factual, concise, dated in ISO 8601 format (`YYYY-MM-DD`), and attributable with `updated_by_skill`.
- Do not store secrets, credentials, personal data, long requirement text, test results unsupported by evidence, or duplicate artifact contents.
- Use only the statuses defined by the project schema. Distinguish `not_started`, `in_progress`, `blocked`, `completed`, and `not_applicable`; never mark completed merely because planning or generation began.
- Record only source files actually reviewed. Keep assumptions as assumptions and unresolved items in `open_questions` or `risks_and_blockers`.
- Do not infer test execution/pass status from created test cases, code changes, or reviews. Record execution only when actually run and observed.
- If the state file is missing, create it only with `node .gemini/tools/helpers/qe-project.js init-state <project>` (existing docs folder) or `create <project>` (new project). If malformed, ambiguous, or conflicting with evidence, do not silently reset it; report the issue and preserve a backup before a repair if repair is necessary and authorized.
- If updating the state fails, report that failure. Never claim it was updated unless the saved file was verified.
- State-file update is subordinate to the requested task; do not broaden scope or overwrite project artifacts just to make statuses look complete.

## Checkpoint guardrails
- The `checkpoint` object is a compact, replace-in-place recovery snapshot, not an activity log or transcript. Do not append checkpoint history.
- Keep no more than 5 task markers in each of `work_in_progress` and `next_actions`; keep combined checkpoint text under 2,000 characters. Each marker has a stable short `task_id`, concise `task`, and explicit status (`in_progress`/`blocked` for active work; `pending`/`blocked` for next actions), plus an optional artifact path.
- At `/qe:start` and `/qe:continue`, reconcile task markers against authoritative project state and linked artifacts. Remove markers only for tasks verified completed, cancelled, superseded, or stale; never trust the marker alone as proof of completion.
- Remove completed, cancelled, superseded, or stale items whenever writing a checkpoint. Completed work belongs in artifact status/paths or durable project documents, not in checkpoint lists.
- Record only current in-progress work, the next concrete actions, and unresolved blockers/decisions already represented in their dedicated arrays. Do not duplicate large explanations.
- Never mark a task complete from a verbal plan alone. Verify the artifact or evidence first; if uncertain, leave it active or state the uncertainty.
- `/qe:checkpoint <project>` should read current state and inspect only artifacts relevant to the current task, then replace the checkpoint snapshot with task markers and verify the resulting JSON.
- Skills should update the checkpoint when work is paused mid-task or a material state transition occurs. Do not checkpoint every minor action.
- A checkpoint must not store conversation text, secrets, personal data, or copied requirements/test cases.

