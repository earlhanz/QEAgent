---
name: generate-manual-test
description: Generate detailed, executable manual test cases for a QEAgent project from its approved QE scenarios and design documents. Use when asked to create or expand manual tests after analysis is approved; requirements and stories define scope only.
---

# Generate Manual Test

## Purpose

Turn project source material into detailed, risk-based manual test cases that a person unfamiliar with the project can execute and evaluate without relying on undocumented knowledge.

## Source material

This is a gated phase. Before generating, run `node .gemini/tools/qe-workflow.js check-approved analysis <project>`. If it fails, stop and report the unmet prerequisite (normally `/analysis:approve <project>`). Generate only from approved scenarios in `docs/<project>/strategy/test-scenarios.json` (mirrored in the workbook `Scenario Register`) and the design sections they cite. Requirements and stories may narrow scope or reveal gaps; they never add expected behavior absent from the design.

When the user identifies a project, read its source material from the project documentation folders under `docs/<project>/`. The starter project name is `sampleprojectname`. Save generated manual test deliverables under `output/<project>/manualtests/`; for the starter project, this is `output/sampleprojectname/manualtests/`.

Use the relevant source subfolder based on the material type:

- `docs/<project>/design/` for design documents, wireframes, and UX specifications.
- `docs/<project>/user-story/` for user stories and acceptance criteria stored with stories.
- `docs/<project>/requirements/` for functional and non-functional requirements.

Write manual test deliverables to `output/<project>/manualtests/` (the path the phase fingerprint covers). If a requirement or story conflicts with the design, or describes behavior the design lacks, do not test it as expected behavior. Record it as a gap in the case notes and traceability, and ask only if it blocks reliable test design.

Before drafting, list and read relevant files in the selected source folder. Do not silently proceed as though you inspected a source folder if it is empty, unavailable, or contains unsupported files. In that case, say what was unavailable and use any source the user supplied directly, or ask for the needed material.

## Traceability workbook

After generating manual test cases, update the project traceability workbook at `docs/<project>/traceability-matrix.xlsx` (for the starter project: `docs/sampleprojectname/traceability-matrix.xlsx`). Add or update traceability rows linking each generated manual test case to its source requirement and the related design element when one is identifiable. Include source IDs, file paths/sections, test case ID/title, output file/section, and concise coverage status or gap notes. Use one row per distinct design-requirement-test link; repeat identifiers where one item maps to multiple items. Do not invent a design or requirement link: leave the field blank and explain the missing trace in Gap / Notes. Preserve existing workbook content and update the existing matrix rather than replacing it. If source documents do not establish traceability, record the available links and document the gap. Report if the workbook cannot be read or updated; never claim traceability was recorded unless the update succeeded.

## Workflow

1. Identify the project and source type from the request. If unclear, use explicitly supplied files or content first; otherwise inspect the applicable folders under `docs/<project>/`.
2. Extract behaviors, actors, starting states, constraints, acceptance criteria, and risks. Keep traceability to the source file and relevant heading, story, or requirement ID when available.
3. Record ambiguities and assumptions. Ask a focused question only when missing information materially changes the expected behavior or test outcome; otherwise proceed with clearly labeled assumptions.
4. Prioritize critical paths, meaningful negative cases, boundaries, permissions, and state transitions supported by the source.
5. Write self-contained cases. Assume the tester knows nothing about this project: explain terminology, environment, account/setup needs, where to navigate, what to enter, and how to reach the feature.
6. Break actions into explicit, small steps. Every step must include an observable validation and be formatted with all three fields: **Test Description**, **Expected Result**, and **Actual Result**.
7. Review each case for traceability, completeness, executability, and a clear pass/fail decision. Ensure no step depends on undocumented project knowledge.
8. Invoke `test-data-generator` for required synthetic case data and save manual datasets under `output/<project>/testdata/manual/`.
9. Update the traceability workbook with scenario → manual test → data links and verify the workbook.
10. Record `qe-state.js artifact <project> manual_tests completed generate-manual-test output/<project>/manualtests/` after files are saved. Send the cases to `manual-test-reviewer`, which saves its report and records reviewer status itself. Revise for findings and repeat the review. When the reviewer reports ready, run `node .gemini/tools/qe-workflow.js prepare manual_tests <project>`, present the version, and stop for human approval. The generator never sets reviewer status.
11. Feedback via `/manual:feedback <project> <comment>` reopens and revises this phase; prepare and review the changed version again. Only `/manual:approve <project>` may unlock automation; the validator checks reviewer status, prior approval, artifacts, and fingerprint.

## API scenarios

Manual cases for `layer: "api"` scenarios use the same format and three step fields. Write them so someone new to the project can send the request with Postman or curl. Name the operation (`api_ref`) and the environment variable that holds the base URL. Say how to obtain test credentials through the approved process, without including any credential. Give the exact method, path, headers by name, and body. Make each validation a separate step (status code, then each required response field, then any follow-up GET that confirms state). Expected results come from the design or an OpenAPI spec, never from a Postman example alone. Never include environment values, tokens, or keys.

## Output format

Use the project's test management format if one is supplied, while preserving the required three fields for every step. Otherwise use this format:

### Test Case

- **Test Case ID:** Stable unique identifier; use an existing project convention if present.
- **Title:** Concise behavior being verified.
- **Source:** Requirement, user story, acceptance criterion, design reference, defect, or clearly labeled exploratory goal. Include file path and identifier/heading when available.
- **Priority:** P1 / P2 / P3, with brief rationale when useful.
- **Objective:** What this case verifies.
- **Preconditions:** Environment, URL/application entry point, account and permissions, starting state, and setup. Explain how an unfamiliar tester can satisfy them.
- **Test Data:** Exact values, data constraints, and preparation instructions. If data generation is needed, identify the need for the `test-data-generator` skill.
- **Steps:** A numbered table. Every row must have these columns:

| Step | Test Description | Expected Result | Actual Result |
|---|---|---|---|
| 1 | Explicit action, including navigation and exact inputs | Observable result expected after this action | Leave blank for the tester to record what happened |

- **Overall Expected Result:** End-to-end outcome that determines whether the case passes.
- **Notes:** Assumptions, risks, dependencies, or uncovered questions.

## Quality rules

- Make tests as detailed as necessary for an unfamiliar person to follow. Avoid insider shorthand; define project-specific terms and explain navigation and setup.
- Keep each test focused on one primary behavior and a clear pass/fail outcome.
- Every action must have its own validation. Do not group multiple actions together under a single expected result.
- State expected results as observable behavior, not vague phrases such as "works correctly."
- Leave **Actual Result** blank in generated cases so the tester can record the observed result. Never fill it with the expected result or imply execution occurred.
- Cover positive, negative, boundary, and permission scenarios when relevant to the source and risk.
- Do not invent requirements or expected behavior. Label assumptions and call out gaps.
- Distinguish proposed tests from executed tests. Do not claim a test passed unless it was executed and the result observed.
- Do not generate tests while the analysis gate is unapproved, and do not proceed to automation until current manual test artifacts have reviewer-ready status and explicit `/manual:approve`.
## Reference materials

Consult these bundled references when applicable:
- Read `references/manual-test-case-template.md` when the task uses that guidance.
- Read `references/test-design-techniques.md` when the task uses that guidance.
- Read `../_shared/references/traceability-standard.md` when the task uses that guidance.
- Read `../_shared/references/risk-prioritization.md` when the task uses that guidance.
- Read `../_shared/references/privacy-test-data.md` when the task uses that guidance.


## Project state tracking

When this task changes project progress or artifacts, use `.gemini/tools/helpers/qe-state.js` to update state according to ../_shared/references/project-state-guardrails.md and project-state-schema.md. Use `qe-files.js` for bounded text reads/writes; use spreadsheet tooling for traceability workbooks. Follow `.gemini/skills/_shared/references/deterministic-tools.md`. Do not update state for a read-only review unless project readiness changes or a review deliverable is saved.

