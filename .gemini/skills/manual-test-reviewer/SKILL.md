---
name: manual-test-reviewer
description: Review existing manual test cases for traceability, coverage, clarity, novice-friendly execution, and step-by-step validation. Use when asked to review, audit, or assess manual tests against design documents, user stories, requirements, or a traceability matrix.
---

# Manual Test Reviewer

## Purpose

Review manual test cases for source alignment, coverage, clarity, executability, and reliable pass/fail validation.

## Trigger and boundaries

Use this skill when asked to review, audit, or assess existing manual test cases. For creating new cases, route to `generate-manual-test`. Do not silently rewrite or modify the reviewed test cases or traceability workbook. Make changes only when the user explicitly asks.

## Source material

Identify the project. For the starter project, use `sampleprojectname`; replace it with the project folder name when configured.

Read relevant material from the folders that apply:

- `docs/<project>/design/` for design documents, wireframes, and UX specifications.
- `docs/<project>/user-story/` for user stories and acceptance criteria.
- `docs/<project>/requirements/` for functional and non-functional requirements.

The design documents are the authority for expected behavior; requirements and stories define scope. Report any case whose expected result is not supported by the cited design, and any requirement/design conflict, as a finding. Read `docs/<project>/traceability-matrix.xlsx` when present. Review the supplied test cases or, when the user identifies a location, inspect the relevant cases under `output/<project>/manualtests/`.

Before reviewing, list and read relevant files. If a source, test file, or workbook is missing, empty, unavailable, or unsupported, disclose the limitation and review only what is available. Do not imply that unavailable material was inspected.

## Review workflow

This is part of the manual-test approval loop. Review only tests derived from approved analysis scenarios and corresponding design. When findings exist, return them to Generate Manual Test for revision and review again. Save the review report to `docs/<project>/reviews/manual-test-review.md`. When reviewer-ready, record `reviewer_status=ready` and the evidence path with `qe-state.js`, then run `qe-workflow.js prepare manual_tests <project>` to fingerprint the reviewed version and set `awaiting_human_approval`. Stop; `/manual:approve <project>` performs deterministic precondition validation and records approval. `/manual:feedback <project> <comment>` reopens this phase and invalidates prior approval.

1. Identify the project, scope, supplied test cases, and applicable source materials.
2. Read the tests and compare them with the relevant designs, requirements, stories, and acceptance criteria. Treat source documents as evidence; do not invent expected product behavior.
3. Review each case for:
   - Traceability to a source and alignment with that source.
   - Coverage of relevant user flows, negative cases, boundaries, permissions, and state changes supported by the source and scope.
   - Enough detail for a person unfamiliar with the project to execute it, including setup, navigation, terminology, account or permission needs, and exact inputs.
   - One primary behavior and a clear pass/fail outcome.
   - A separate, observable validation after every action.
   - The required step fields: `Test Description`, `Expected Result`, and `Actual Result`.
   - Observable expected results that do not invent product behavior.
   - Appropriate preconditions and safe, useful test data.
   - Duplicates, contradictions, dependencies, and gaps.
4. When the traceability workbook exists, compare its design → requirement → manual test links against source material and reviewed cases. Report missing, stale, or unsupported links. Do not alter the workbook during a review unless the user specifically requests traceability updates.
5. Save the complete review report at `docs/<project>/reviews/manual-test-review.md`, including scope, findings, limitations, and verdict.
6. If findings require edits, set reviewer status to `needs_changes` with the saved report path and return to Generate Manual Test. After revision, rerun this review and save the updated report.
7. Fill in the verdict before recording status, because the helper hashes the saved report and any later edit forces a new review. If ready, record the report using `node .gemini/tools/helpers/qe-state.js reviewer <project> manual_tests ready manual-test-reviewer docs/<project>/reviews/manual-test-review.md`, then run `node .gemini/tools/qe-workflow.js prepare manual_tests <project>`. Do not set phase status directly. Present the artifact version and stop for human approval.

## Severity levels

- **Critical:** The test can produce a false pass or miss a serious requirement, risk, or core user flow.
- **High:** A significant requirement is untested, or a case cannot be reliably executed or verified.
- **Medium:** A material clarity, coverage, data, or maintenance issue may still allow execution.
- **Low:** A minor improvement with little effect on execution or confidence.
- **Info:** A source limitation, assumption, or question that affects interpretation.

## Default review output

### Review summary

Give a brief assessment, identify the project and source material reviewed, and state limitations.

### Findings

| ID | Severity | Test Case / Step | Finding | Evidence | Recommended correction |
|---|---|---|---|---|---|

Order findings from highest to lowest severity. If there are no findings, state that and note source or coverage limitations.

### Coverage notes

List important source requirements or behaviors that appear untested when source material is available.

### Verdict

Choose one:

- **Ready:** No material issues identified.
- **Ready with changes:** Usable after the listed fixes.
- **Needs rework:** Material gaps or reliability problems prevent confident execution.

## Rules

- Separate observed issues from assumptions and recommendations.
- Do not call missing coverage a defect unless the source or agreed scope supports that expectation.
- Do not claim tests passed or failed based on review alone; execution evidence is required.
- Prefer specific, actionable findings to general advice.
- Preserve the required `Test Description`, `Expected Result`, and `Actual Result` fields in any recommended step format.
## Reference materials

Consult these bundled references when applicable:
- Read `references/manual-test-review-checklist.md` when the task uses that guidance.
- Read `../_shared/references/traceability-standard.md` when the task uses that guidance.


## Project state tracking

When this task materially changes readiness, save review evidence and use `.gemini/tools/helpers/qe-state.js reviewer <project> manual_tests <ready|needs_changes> manual-test-reviewer docs/<project>/reviews/manual-test-review.md` and follow ../_shared/references/project-state-guardrails.md. Use `qe-files.js` for bounded text access; follow `.gemini/skills/_shared/references/deterministic-tools.md`. Do not update state for a read-only review unless readiness changes or a review deliverable is saved.

