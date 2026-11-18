# Playwright TypeScript Structural Templates

Adapt names and paths to inspected project conventions. Placeholders below are illustrative, not real selectors or expected behavior.

## Page Object — `src/pages/example.page.ts`

```ts
import type { Locator, Page } from '@playwright/test';

export class ExamplePage {
  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Example' });
  }

  get status(): Locator {
    return this.page.getByRole('status');
  }

  async open(): Promise<void> {
    await this.page.goto('/example');
  }

  async submit(value: string): Promise<void> {
    await this.page.getByLabel('Example value').fill(value);
    await this.page.getByRole('button', { name: 'Submit' }).click();
  }
}
```

No `expect()` in the page object.

## Custom Fixture — `src/fixtures/test.ts`

```ts
import { test as base, expect } from '@playwright/test';
import { ExamplePage } from '../pages/example.page';

type QEFixtures = { examplePage: ExamplePage };

export const test = base.extend<QEFixtures>({
  examplePage: async ({ page }, use) => {
    await use(new ExamplePage(page));
  },
});

export { expect };
```

Register page objects/components here. Specs import `test` and `expect` from this fixture module.

## Feature Spec — `tests/example.spec.ts`

```ts
import { test, expect } from '../src/fixtures/test';

test('submits a valid example value', async ({ examplePage }) => {
  await examplePage.open();
  await examplePage.submit('synthetic-value');
  await expect(examplePage.heading).toBeVisible();
  await expect(examplePage.status).toHaveText('Submission complete');
});
```

The page object exposes the interaction locator; the spec owns the assertion.

## API Spec Pattern

```ts
import { test, expect } from '@playwright/test';

test('returns the documented resource for a valid request', async ({ request }) => {
  const response = await request.get('/documented/resource');
  await expect(response).toBeOK();
  const body: unknown = await response.json();
  expect(body).toMatchObject({ id: expect.any(String) });
});
```

Replace illustrative paths and assertions only with design/contract-backed details. For repeated API setup, inject a typed client via custom fixtures and keep assertions in specs.
