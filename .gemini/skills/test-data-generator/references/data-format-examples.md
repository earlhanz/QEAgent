# Test Data Format Examples

Examples are format-only placeholders; use project-approved schemas.

```json
{"id":"SYN-001","name":"Sample User","active":true,"amount":12.5}
```

```csv
id,status,amount
SYN-001,valid,12.50
SYN-002,boundary,0.00
```

Record schema, required/optional fields, types, constraints, relationships, locale/timezone, validity class, scenario purpose, and cleanup. Keep identifiers synthetic and non-routable. Do not infer production schema from examples.
