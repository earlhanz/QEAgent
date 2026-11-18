---
name: test-data-generator
description: Generate safe synthetic data sets and boundary inputs from approved test scenarios and project data contracts, then save and trace them to the project.
---

# Test Data Generator

## Purpose and routing

Generate synthetic, reproducible test data for manual and automated test workflows. Use when a test needs concrete values, fixtures, boundary cases, or a data file. Do not invent product fields or constraints. Route changes to the test scenario or data contract to QE-Architect or the originating test-generation skill.

## Required workflow

1. Read the selected project's compact state with `node .gemini/tools/helpers/qe-state.js summary <project>`.
2. Identify data needs from the approved strategy/scenario and supplied design, story, requirement, or API schema. Use `.gemini/tools/helpers/qe-files.js` to list and read only the relevant text sources. Use proper spreadsheet tooling for traceability workbooks.
3. Define the required fields, types, allowed values, boundaries, relationships, and privacy constraints from those sources. Record missing constraints as assumptions or questions; never infer a product contract from example data.
4. If the built-in `person`, `account`, or `order` profile exactly fits, use `qe-data.js` with a stable documented seed and requested count. For manual cases, save under `output/<project>/testdata/manual/`; for automation, save under `output/<project>/testdata/automation/`. The helper requires `manual/<file>` or `automation/<file>` as the filename so each dataset is covered by its phase fingerprint and the BeforeTool gate. Do not use these fixed profiles when their fields do not match the project contract.
5. For project-specific formats, derive a schema descriptor only from authoritative sources and use `qe-data.js ... schema ... --schema <path>` when its supported types/bounds represent the contract. Save a derived descriptor under the relevant `output/<project>/testdata/manual/` or `automation/` folder. If the requested constraints cannot be generated reliably with the helper, report the limitation or ask for a concrete schema. Never label manually composed data as tool-generated.
6. Validate the saved file against source constraints using a deterministic check where available; otherwise perform a focused schema/record review and state the limits. Do not claim application validation from data-file inspection.
7. Update traceability links between scenario/test and dataset using the approved workbook process. Then update project state with `qe-state.js artifact ...` only after file and traceability writes are verified. Use concise handoffs with paths and counts.

## Safety and quality rules

- Use fictional, synthetic values only. Never use production exports, real personal data, credentials, secrets, or live customer identifiers.
- Use reserved/invalid domains and safe phone values supplied by the helper where applicable.
- Make datasets deterministic where practical: use and record a seed, profile, record count, and generator manifest.
- Include positive, negative, boundary, equivalence, null/empty, duplicate, and relationship cases only when relevant to the approved scenarios.
- Keep data minimal. Do not create huge datasets unless the performance scenario requires them and the user has requested that scope.
- Preserve referential integrity and uniqueness where the test contract requires it. State when the built-in profile cannot guarantee a project-specific constraint.
- Do not overwrite existing data without the user's requested revision intent and the helper's explicit `--replace` option.
- Do not place sensitive values in chat, logs, project state, or manifests.

## Compact output

Return the dataset path, manifest path, profile/seed/count or schema source, scenarios covered, validation performed, assumptions, and blockers. Do not paste the whole dataset into the response.

## Tool standard

Follow `.gemini/skills/_shared/references/deterministic-tools.md`, `.gemini/skills/_shared/references/privacy-test-data.md`, and the schema example in `references/synthetic-data-schema.example.json`.
