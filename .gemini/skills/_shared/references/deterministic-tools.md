# Deterministic QE Helper Tools

Run helpers from the QEAgent project root with Node.js. Helpers use only Node's built-in modules; do not install packages for routine file, state, or sample-data operations. These helpers are local CLI utilities, invoked through the Gemini CLI shell tool. Examples use PowerShell here-strings for stdin; in bash use a quoted heredoc (`<<'EOF'`) instead. Every helper exits with code 2 and a one-line `<helper>: <reason>` message on refusal.

## Project creation

```powershell
node .gemini/tools/helpers/qe-project.js create <project>      # new docs/ and output/ folders, state, workbook template
node .gemini/tools/helpers/qe-project.js init-state <project>  # existing docs/<project>/ without qe-state.json
```

`create` refuses if either project folder exists. `init-state` refuses if state exists and only adds missing folders. Both copy the workbook template only when the project has no workbook. Neither overwrites files.

## File access

Use `.gemini/tools/helpers/qe-files.js` for bounded UTF-8 text reads and writes inside the selected project's `docs/` or `output/` tree.

```powershell
node .gemini/tools/helpers/qe-files.js list <project> docs .
node .gemini/tools/helpers/qe-files.js read <project> docs requirements/brief.md
node .gemini/tools/helpers/qe-files.js read <project> output testdata/dataset.json
@'
Generated markdown or JSON content
'@ | node .gemini/tools/helpers/qe-files.js write <project> output testdata/example.json
```

- Read is limited to 12 KiB per call. For oversized files, extract relevant sections with a targeted command or split the source; do not dump entire repositories into context.
- Writes read content from stdin, are limited to 2 MiB, create parent folders, and refuse to overwrite by default. Pass `--replace` only when replacing an existing artifact is part of the requested revision.
- The helper refuses binary reads and writes to `qe-state.json`. Use suitable spreadsheet tooling for Excel workbooks and `qe-state.js` for project state.
- Paths must stay inside the selected project's docs or output folder; project slugs are validated and symlinks are rejected.
- `list` returns names and file types, not contents; use it to discover only relevant files.

## API sources

Use `.gemini/tools/helpers/qe-api.js` to inspect Postman collections (v2.0/v2.1) and OpenAPI/Swagger **JSON** under `docs/<project>/` without loading them whole:

```powershell
node .gemini/tools/helpers/qe-api.js outline <project> design/api/orders.postman_collection.json      # index, folder, name, method, URL, example codes
node .gemini/tools/helpers/qe-api.js outline <project> design/api/orders.openapi.json 50              # operationId, response codes; maxItems 1..200
node .gemini/tools/helpers/qe-api.js show <project> design/api/orders.postman_collection.json 3       # one operation: headers, query, body, pm assertions, examples
```

Read-only. Files are limited to 5 MiB and output to 12 KiB. Paths are relative to `docs/<project>/`, and symlinks and traversal are rejected. Sensitive keys (password, secret, token, API key, auth, cookie, session), bearer/JWT strings, and sensitive query values are replaced with `<redacted>`; `{{variables}}` are kept as names. Collection variable values and environment files are never output. Postman example responses are labeled `observed example only`. YAML specs are not parsed; use `qe-files.js search`/`read-lines` for them. `$ref`s are shown, not resolved.

## Synthetic datasets

Use `.gemini/tools/helpers/qe-data.js` when the built-in synthetic profiles match the project's data needs:

```powershell
node .gemini/tools/helpers/qe-data.js generate <project> person 25 qe-seed-01 manual/people.json
node .gemini/tools/helpers/qe-data.js generate <project> account 10 qe-seed-01 automation/accounts.csv
node .gemini/tools/helpers/qe-data.js generate <project> order 50 qe-seed-01 automation/orders.json
node .gemini/tools/helpers/qe-data.js generate <project> schema 25 qe-seed-01 manual/cases.json --schema docs/<project>/requirements/test-data-schema.json
```

Supported profiles are `person`, `account`, `order`, and `schema`; counts are 1–1000. The same profile/schema, count, and seed produce the same rows. Schema mode reads a JSON descriptor from `docs/<project>/...` or `output/<project>/testdata/...`; see `.gemini/skills/test-data-generator/references/synthetic-data-schema.example.json`. Supported field types are `string`, `integer`, `number`, `boolean`, `enum`, `email`, `phone`, `date`, and `id`. Data and a `.manifest.json` file are written under `output/<project>/testdata/manual/` or `automation/`; the `manual/` or `automation/` filename prefix is required so each dataset falls inside its phase fingerprint. Email addresses use `example.invalid`; generated data is synthetic and must never be treated as evidence of application behavior.

Before using a profile, compare its fields and constraints with the supplied design, data contract, or approved test scenario. If a built-in profile does not match, derive a schema descriptor from an authoritative source, save it under the project docs or testdata folder, and run schema mode. Do not force a profile or invent a contract. Schema mode supports only the listed field types and simple value bounds; report constraints it cannot represent and validate those separately.

The generator refuses to overwrite output unless `--replace` is provided. Never use real personal data, credentials, production exports, or secrets as seed material.

## Project state and checkpoints

Use `.gemini/tools/helpers/qe-state.js` rather than editing `qe-state.json` directly:

```powershell
node .gemini/tools/helpers/qe-state.js summary <project>
node .gemini/tools/helpers/qe-state.js artifact <project> test_data completed test-data-generator output/<project>/testdata/
node .gemini/tools/helpers/qe-state.js reviewer <project> manual_tests ready manual-test-reviewer docs/<project>/reviews/manual-test-review.md
node .gemini/tools/helpers/qe-state.js reopen <project> manual_tests manual-feedback
node .gemini/tools/helpers/qe-state.js invalidate <project> automation heal-playwright-automation
node .gemini/tools/helpers/qe-state.js execution <project> output/<project>/.qe/runs/<run-id>/run-summary.json automated-test-execution
@'
{"work_in_progress":[{"task_id":"data-set","task":"Generate synthetic boundary data","status":"in_progress","artifact_path":"output/<project>/testdata/"}],"next_actions":[{"task_id":"review-data","task":"Review generated dataset","status":"pending"}]}
'@ | node .gemini/tools/helpers/qe-state.js checkpoint <project> qe-checkpoint
```

`summary` returns a compact view. Any supplied artifact path must stay inside the project's `docs/` or `output/` folder, and `completed` requires it to exist. `reviewer` requires a non-empty report under `docs/<project>/reviews/`, stores its SHA-256 and the phase fingerprint, clears any prepared version, and is refused while the gate is approved. `reopen`/`invalidate` reset that gate and every downstream gate in review or approved, and log a bounded feedback entry. `execution` validates the run summary format in `agent-handoff-standard.md` before recording it. Checkpoint writes replace the current snapshot, allow at most 5 items in each list, and enforce the 2,000-byte bound. Always reconcile against verified artifacts before writing.

## Phase gates

```powershell
node .gemini/tools/qe-workflow.js prepare analysis <project>         # after artifacts are saved (and reviewer is ready for manual/automation)
node .gemini/tools/qe-workflow.js validate manual_tests <project>    # dry-run approval checks
node .gemini/tools/qe-workflow.js approve automation <project>       # only via /automation:approve
node .gemini/tools/qe-workflow.js check-approved automation <project> # before execution or downstream work
```

`prepare` requires the phase artifacts, a design source (analysis), the reviewer report unchanged since it was recorded (manual/automation), current upstream approvals, and for automation a recorded virtualization decision. It stores the gate fingerprint (phase artifacts + workbook + reviewer report). `approve` recomputes it and refuses any drift. `check-approved` confirms a phase and its upstream phases are approved and their own artifacts are unchanged since approval; later-phase workbook edits do not revoke an earlier approval.

## General usage rules

- Prefer one helper call that returns a compact JSON result over reading a large file into the model and manually restating it.
- Keep generated content in project artifacts; report only status, paths, counts, assumptions, and blockers to the orchestrator/user.
- Helpers are deterministic enforcement for their documented operations only. They do not validate product semantics, approve phase gates, or replace human review. Use `qe-workflow.js` for approval gates.
- If a helper rejects an operation or the source is ambiguous, stop that operation and report the exact missing input; do not bypass the guard by using generic shell writes.
