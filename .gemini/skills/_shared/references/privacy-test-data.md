# Privacy and Test Data Safety

- Prefer synthetic data that cannot identify a person or expose confidential business information.
- Never put credentials or secrets in test code, fixtures, examples, logs, or reports. Use approved secret management and placeholders.
- Do not copy production sensitive data into test environments unless documented controls explicitly approve it; validate anonymization.
- Minimize fields and retention. Respect access, residency, consent, and deletion requirements.
- Use realistic formats and boundaries without identifiers that could contact or affect real people.
- Label synthetic examples and assumptions; document cleanup/reset needs.
- If policies are unknown, flag uncertainty and avoid sensitive data.
- API sources: Postman collections and environment files often contain real base URLs, tokens, API keys, and passwords. Save only collections (not environment files) under `docs/<project>/design/api/`, strip secrets before saving where possible, and inspect them with `qe-api.js`, which redacts sensitive values. Never copy a variable value, token, or key into tests, test data, manual cases, reports, or state.
