# Manual Test Review Checklist

## Source and traceability
- Is the source identifiable and current? Does expected behavior match it?
- Are conflicts and assumptions visible? Does the matrix agree with the case/source?
## Executability
- Can a novice identify environment, entry point, account, permissions, setup, terms, inputs?
- Is each test focused and independently runnable? Are dependencies and cleanup clear?
## Steps and results
- Is each action separate and explicit?
- Does every step include `Test Description`, `Expected Result`, and blank `Actual Result`?
- Is each expected result observable, specific, and source-supported?
## Coverage and data
- Are applicable positive, negative, boundary, permission, state, and failure conditions covered?
- Is data safe and reproducible? Are duplicates, contradictions, and gaps identified?

Report evidenced findings only. Missing coverage is a finding only when supported by source or agreed scope. Do not edit reviewed artifacts unless asked.
