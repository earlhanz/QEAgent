# Playwright Project Stack Conventions

Treat project-specific choices as unknown until inspected. Before implementation, record evidence for:
- Playwright and TypeScript versions, package manager, build tools, and supported runtime.
- `playwright.config.ts`, scripts, existing test commands, projects, reporters, browser targets, and CI jobs.
- Existing folder layout for pages, components, fixtures, specs, API clients, and shared test helpers.
- Naming, setup/teardown, tags, assertion, authentication, storage-state, and test-data conventions.
- Environment configuration, service virtualization, artifact retention, and secret handling.

Prefer existing conventions when suitable. Do not introduce a competing framework or duplicate page objects/fixtures. Mark any recommended change as proposed and explain compatibility/CI implications. Never store secrets in source.
