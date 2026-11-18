# Playwright API Test Standard

Use this standard for API-layer scenarios (`layer: "api"` in `strategy/test-scenarios.json`). It adds API specifics to `playwright-architecture-and-locators.md` and `playwright-sync-and-isolation.md`; those still apply.

## API sources and their authority

Save API sources under `docs/<project>/design/api/` so they are design sources: the analysis fingerprint covers them, and changing one reopens analysis approval.

| Source | Use it for | Limits |
|---|---|---|
| OpenAPI / Swagger spec (JSON or YAML) | Paths, methods, parameters, request schemas, documented status codes, response schemas | Authoritative for the contract only where the design does not contradict it |
| Postman collection (v2.0 / v2.1 JSON) | Endpoints, methods, URL templates, headers that are required (names only), request body shape, test scripts that state expectations | **Saved example responses record one observed response, not the required behavior.** Use an example as an expected result only when the design or an OpenAPI spec confirms it. Otherwise record it as a gap. |
| Design document prose or diagrams | Business rules, validation, error handling, state transitions | Wins over a collection when they conflict; report the conflict |
| Postman environment files | Variable names only | Never copy values. Environment files often hold real URLs, tokens, and passwords. Do not save them in the project. |

Inspect large collections with `node .gemini/tools/helpers/qe-api.js outline <project> design/api/<file>.json` and `show <project> design/api/<file>.json <index>`. The helper returns bounded, redacted summaries. It reads JSON only; for a YAML OpenAPI file, use `qe-files.js search`/`read-lines`.

Never invent an endpoint, parameter, payload field, status code, or response field. If a scenario needs something the sources do not define, stop and report the gap.

## Structure inside the automation root

```text
output/<project>/automated tests/
├── src/api/              # Typed API clients: one per resource or service; transport only, no expect()
├── src/api/types.ts      # Request/response types derived from the spec or collection (cite the source)
├── src/fixtures/         # Fixtures that create clients from Playwright's `request` / `playwright.request`
└── tests/api/            # *.spec.ts with all assertions
```

Follow an existing client folder if the project already has one.

## Clients and fixtures

- A client wraps `APIRequestContext` calls for one resource, takes typed inputs, and returns the `APIResponse` (or a typed body plus the response) so the spec can assert status and body. Clients never call `expect()`.
- Map Postman `{{baseUrl}}` to Playwright `use.baseURL` in `playwright.config.ts`, set from an environment variable. Map other `{{variables}}` to environment variables or fixture values, never literals.
- Auth: obtain tokens through a setup fixture or `storageState`/`extraHTTPHeaders` from environment variables or the project's secret mechanism. Never hard-code a token, API key, or password, and never print one.
- Translate Postman pre-request scripts into fixture setup. Translate Postman `pm.test`/`pm.expect` scripts into spec assertions only when the expectation is design-backed.

## Assertions

- Assert the documented status code exactly (`expect(response.status()).toBe(201)`), not just `toBeOK()`, when the design or spec defines it.
- Assert the required response fields and their types or values from the spec. Use `toMatchObject` for required fields, and a schema check if the project already has a validator. Do not add a new dependency without a documented need.
- Cover documented negative cases: validation errors, missing or invalid auth (401/403), not found, conflict. Only cover cases the design or spec defines; record the rest as gaps.
- Assert documented headers that matter to behavior (for example `Location` after create), not incidental ones.

## Data and isolation

- Create the records each test needs through the API, with unique synthetic values from `output/<project>/testdata/automation/` or generated per test. Delete or reset them in teardown when the API supports it.
- Do not depend on records created by another test or left in a shared environment.
- Never run state-changing requests (POST/PUT/PATCH/DELETE) against production or an unconfirmed environment. Confirm the target `baseURL` comes from an approved test environment.

## Traceability

Record each API test against its scenario ID, manual case ID, and the API source reference (`design/api/<file>#<request or operationId>`) in the workbook `Scenario Register` (`Automated Test ID(s) / Path`). Note collection-only expectations that lacked design support under `Gap / Notes`.

## Minimal example

```ts
// src/api/orders.client.ts
import type { APIRequestContext, APIResponse } from '@playwright/test';
import type { CreateOrderRequest } from './types';

export class OrdersClient {
  constructor(private readonly request: APIRequestContext) {}

  create(body: CreateOrderRequest): Promise<APIResponse> {
    return this.request.post('/orders', { data: body });
  }
}
```

```ts
// src/fixtures/api.ts
import { test as base, expect } from '@playwright/test';
import { OrdersClient } from '../api/orders.client';

export const test = base.extend<{ orders: OrdersClient }>({
  orders: async ({ request }, use) => { await use(new OrdersClient(request)); },
});
export { expect };
```

```ts
// tests/api/orders.spec.ts — SC-014 / TC-031, design/api/orders.postman_collection.json#Create order
import { test, expect } from '../../src/fixtures/api';

test('creates an order and returns its id', async ({ orders }) => {
  const response = await orders.create({ sku: 'SKU-1001', quantity: 1 });
  expect(response.status()).toBe(201);
  expect(await response.json()).toMatchObject({ id: expect.any(String), status: 'placed' });
});
```

Paths, fields, and values here are placeholders. Use only what the project's design and API sources define.
