# Playwright Architecture and Locator Standard

## Folder responsibilities

- `src/pages/`: page-specific locators and user actions.
- `src/components/`: reusable widgets shared across pages.
- `src/fixtures/`: custom Playwright fixtures and dependency injection.
- `tests/`: `.spec.ts` files containing scenarios and all assertions.
- API clients may live in the project's established API/client folder; keep transport helpers separate from assertions.

Inspect the repository first. If it uses equivalent established paths, follow them rather than duplicating or restructuring the project.

## Fixtures-first Page Object Model

Construct page objects in fixtures and inject them into test callbacks. Do not instantiate them inside specs. Pages/components expose locators and actions only; all `expect()` calls stay in specs.

## Locator priority

Use the first reliable locator in this exact order:

1. `getByRole()` with accessible name.
2. `getByLabel()`.
3. `getByPlaceholder()`.
4. `getByText()` for stable user-facing text.
5. `getByTestId()` when the project provides a stable test ID.

CSS selectors and XPath are prohibited by default. If no listed locator is viable, document why, choose the narrowest stable selector, and explain the maintenance risk. Never guess selectors from a screenshot or prose; use supplied DOM snapshots or inspect the application/page.
