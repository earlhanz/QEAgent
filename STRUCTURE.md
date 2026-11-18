# QEAgent structure

```text
QEAgent/
├── GEMINI.md
├── README.md
├── STRUCTURE.md
├── GEMINI-ADOPTION-PROMPT.md                 # Paste into Gemini CLI to load, check, and adopt QEAgent
├── .gemini/
│   ├── settings.json                         # SessionStart + BeforeTool hooks; MCP optional
│   ├── hooks/
│   │   ├── session-start.js                  # Project create/select/checkpoint/continue reminder
│   │   └── phase-gate.js                     # Best-effort write guard (state + gated output folders)
│   ├── agents/
│   │   └── playwright-test-executor.md       # Playwright execution subagent
│   ├── commands/
│   │   ├── qe/                               # /qe:create, start, checkpoint, continue
│   │   ├── analysis/                         # /analysis:start, feedback, approve
│   │   ├── manual/                           # /manual:feedback, approve
│   │   └── automation/                       # /automation:feedback, approve, run, heal
│   ├── tools/
│   │   ├── qe-workflow.js                    # Phase prepare/validate/approve/check-approved
│   │   └── helpers/
│   │       ├── qe-artifacts.js               # Shared path containment + fingerprints (library)
│   │       ├── qe-project.js                 # Create project / init missing state (no overwrite)
│   │       ├── qe-files.js                   # Bounded project text list/read/search/write
│   │       ├── qe-api.js                     # Redacted outline/detail of Postman + OpenAPI JSON (read-only)
│   │       ├── qe-data.js                    # Seeded synthetic dataset generator
│   │       └── qe-state.js                   # State summary, reviewer, reopen, execution, checkpoint
│   └── skills/
│       ├── _shared/references/               # Shared standards (no SKILL.md; not a skill)
│       │   ├── agent-handoff-standard.md
│       │   ├── deterministic-tools.md
│       │   ├── privacy-test-data.md
│       │   ├── project-state-guardrails.md
│       │   ├── project-state-schema.md
│       │   ├── risk-prioritization.md
│       │   └── traceability-standard.md      # Includes scenario JSON format and workbook rules
│       ├── qe-architect/                     # SKILL.md + strategy template, test levels, coverage model
│       ├── generate-manual-test/             # SKILL.md + case template, design techniques
│       ├── manual-test-reviewer/             # SKILL.md + review checklist
│       ├── test-data-generator/              # SKILL.md + schema example, boundary/format patterns
│       ├── generate-automation-test/         # SKILL.md + Playwright architecture, sync, API, templates, stack
│       ├── automated-test-reviewer/          # SKILL.md + automation review checklist
│       ├── service-virtualizer/              # SKILL.md + virtualization guidelines, tooling notes
│       ├── automated-test-execution/         # SKILL.md + execution standard
│       └── heal-playwright-automation/       # SKILL.md + failure matrix, anti-patterns
├── docs/
│   ├── WORKFLOW.md
│   ├── HOW-TO-User-Guide.docx
│   ├── sampleprojectname/                    # Template only: qe-state.json + header-only workbook
│   └── <project>/                            # Created by /qe:create
│       ├── design/                           # Required: sole authority for expected behavior
│       │   └── api/                          # OpenAPI specs, Postman collections (no environment files)
│       ├── user-story/                       # Scope and gaps only
│       ├── requirements/                     # Scope, constraints, data contracts
│       ├── strategy/                         # QE-strategy.md, test-scenarios.json
│       ├── reviews/                          # Saved reviewer reports (gate evidence)
│       ├── qe-state.json                     # Progress index (helpers only)
│       └── traceability-matrix.xlsx          # Traceability + Scenario Register sheets
└── output/
    └── <project>/
        ├── manualtests/
        ├── testdata/
        │   ├── manual/                       # Manual-phase datasets + manifests
        │   └── automation/                   # Automation-phase datasets + manifests
        ├── automated tests/                  # Playwright project root (src/pages, src/components, src/api, src/fixtures, tests, tests/api)
        ├── automationservice/                # Optional user-approved service virtualization
        └── .qe/runs/<run-id>/                # run-summary.json, runner.log, healing handoffs, evidence
```

Planned, not present: `mcp/` (QEAgent-owned MCP server source) and `extension/` (installable Gemini CLI extension). Local maintenance files (`work/`), review records (`docs/review/`, `docs/CRITIQUE-AND-FIXES.md`), and review prompts are git-ignored and not part of the agent; see `.gitignore`.

## Configuration notes

- Hooks are configured in `.gemini/settings.json`; scripts live in `.gemini/hooks/`. Commands are relative (`node .gemini/hooks/...`), so start Gemini CLI from the QEAgent root. The scripts resolve the project root from `GEMINI_PROJECT_DIR`.
- MCP connections go under `mcpServers` in `.gemini/settings.json`.
- `.gemini/tools/helpers/` are local Node CLIs invoked through Gemini's shell tool, not native Gemini tools or MCP servers.
- Stack-specific standards remain provisional until the project technology is inspected.
