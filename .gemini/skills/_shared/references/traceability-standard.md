# QE Traceability Standard

Maintain an auditable relationship from project evidence to test coverage and observed outcomes.

`Design element (when applicable) → requirement/story/acceptance criterion → test condition → manual or automated test case → execution evidence`

Use the existing `Traceability` sheet for design → requirement → manual-case links and the existing `Scenario Register` sheet for design → scenario → manual → automation links. Extend those sheets with test-data identifiers and paths when data is generated. Use stable IDs; otherwise cite file path and section. Use one row per distinct link in `docs/<project>/traceability-matrix.xlsx`, repeating identifiers for many-to-many mappings. Never invent links. Leave unknowns blank and explain gaps. Distinguish planned coverage from execution evidence. During reviews, report discrepancies but do not modify the matrix unless asked. Before updates, read and preserve existing rows, update by stable IDs, and verify the saved workbook.

## Scenario register format (`docs/<project>/strategy/test-scenarios.json`)

```json
{
  "project": "<project>",
  "source_rule": "Expected behavior is derived only from design documents.",
  "virtualization_recommended": false,
  "scenarios": [
    {
      "scenario_id": "SC-001",
      "design_ref": "docs/<project>/design/login.md#lockout",
      "requirement_refs": ["REQ-12"],
      "api_ref": null,
      "condition": "Account locks after the designed number of failed sign-ins",
      "layer": "ui",
      "priority": "P1",
      "data_needs": "Synthetic account in active state",
      "automation_candidate": true,
      "automation_rationale": "Critical path, deterministic setup through API",
      "gaps": []
    }
  ]
}
```

Every scenario needs a `design_ref`; a requirement with no design support is recorded under `gaps`, not as a scenario. Keep `scenario_id` stable across revisions. `layer` is one of `ui`, `api`, `integration`, `manual-only`, or another layer named in the strategy. API scenarios set `api_ref` to the operation in `docs/<project>/design/api/` (`<file>#<operationId>` or `<file>#<folder>/<request name>`); other scenarios leave it `null`.

## Workbook join keys

The two sheets form one chain: `Traceability` links Design ID → Requirement ID → Manual Test Case ID → Test Data; `Scenario Register` links Design ID/Section → Test Scenario ID → Manual Test Case ID(s) → Automated Test ID(s)/Path → Test Data. Join them on Manual Test Case ID and Design ID. The `Traceability` sheet has no scenario column, so record the scenario ID in its `Gap / Notes` cell when a requirement link matters for a scenario.

## Editing the workbook

The workbook is binary. Gemini CLI has no built-in spreadsheet tool and `qe-files.js` is text-only. Edit it only with a spreadsheet capability the project owner has installed (for example a vetted MCP server or a local script). If none is available, report the update as blocked with the intended rows. Never claim traceability was recorded. New projects receive a copy of the header-only template from `docs/sampleprojectname/`; replace its placeholder row on first update.
