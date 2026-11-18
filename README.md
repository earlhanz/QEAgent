# QEAgent starter structure

QEAgent is a human-gated quality engineering agent for **Gemini CLI**. It contains core instructions, focused skills, custom commands, hooks, deterministic Node helpers, and per-project documentation and output folders.

- `GEMINI.md`: QEAgent role, principles, gated workflow summary, skill routing, and handoff rules.
- `.gemini/settings.json`: project-level SessionStart and BeforeTool hooks. MCP servers can be added under `mcpServers` when a project needs them; none are configured.
- `.gemini/commands/`: custom slash commands (`/qe:*`, `/analysis:*`, `/manual:*`, `/automation:*`).
- `.gemini/skills/`: focused QE workflows (QE-Architect, manual generation/review, automation generation/review, test data, virtualization, execution, healing) and shared references.
- `.gemini/agents/`: the `playwright-test-executor` subagent.
- `.gemini/hooks/`: hook scripts referenced by settings.
- `.gemini/tools/`: the phase-gate validator `qe-workflow.js` and `helpers/` Node CLIs for project creation, bounded file access, seeded synthetic data, and guarded state updates. Run them through Gemini CLI's shell tool; they are not native Gemini tools or MCP servers. No npm packages are needed.
- `docs/sampleprojectname/`: the **template** project. It holds only the starter `qe-state.json` and the header-only `traceability-matrix.xlsx` that `/qe:create` copies. It contains no sample design, requirements, or strategy.
- `docs/WORKFLOW.md`: phase sequence, gate prerequisites, and the enforcement boundary.
- `docs/HOW-TO-User-Guide.docx`: beginner guide.
- `docs/review/CLAUDE-REVIEW.md`: latest review findings, fixes, and verification evidence.

`mcp/` (QEAgent-owned MCP server source) and `extension/` (an installable Gemini CLI extension) are planned and not present. `output/<project>/` folders are created by `/qe:create`.

## Quick start

1. Start Gemini CLI from this folder.
2. `/qe:create <project>`, then add design documents to `docs/<project>/design/` and any OpenAPI spec or Postman collection to `docs/<project>/design/api/` (plus stories and requirements in their folders). Do not add Postman environment files: they hold secrets.
3. `/qe:start <project>`, then `/analysis:start <project>`. Review, then `/analysis:approve <project>` or `/analysis:feedback <project> <comment>`.
4. Continue with manual tests and automation. Each phase stops for review and an explicit `/manual:approve` or `/automation:approve`.
5. Run tests only when you ask (`/automation:run <project>`).
6. `/qe:checkpoint <project>` before stepping away; `/qe:continue <project>` to resume or after context compression. SessionStart shows these commands but loads no project files.

Approval commands run the workflow validator, which checks prerequisites, saved reviewer evidence, upstream approvals, and fingerprints before recording approval. Service virtualization is created only when the strategy recommends it and the user agrees. Helper commands, limits, and examples are in `.gemini/skills/_shared/references/deterministic-tools.md`.

**Traceability workbook:** Gemini CLI has no built-in `.xlsx` tool. To let QEAgent update `traceability-matrix.xlsx`, provide a spreadsheet capability (for example a vetted MCP server or local script). Without one, workbook updates are reported as blocked.

**First session:** paste the prompt in `GEMINI-ADOPTION-PROMPT.md` into Gemini CLI, started from this folder. Gemini then loads the workflow, checks that the commands, skills, subagent, hooks, and helpers work in your session, and reports back without changing anything.

Official Gemini CLI references: [get started](https://google-gemini.github.io/gemini-cli/docs/get-started/), [configuration](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/configuration.md), [hooks](https://github.com/google-gemini/gemini-cli/blob/main/docs/hooks/reference.md), [custom commands](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/custom-commands.md), [skills](https://github.com/google-gemini/gemini-cli/blob/main/docs/cli/creating-skills.md), [subagents](https://github.com/google-gemini/gemini-cli/blob/main/docs/core/subagents.md).
