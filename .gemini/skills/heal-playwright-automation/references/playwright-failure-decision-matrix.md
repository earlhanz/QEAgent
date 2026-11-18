# Playwright Failure Decision Matrix

Use observed trace/DOM/API evidence before selecting a fix. Error text alone does not prove the root cause.

| Symptom | Likely category | Evidence to inspect | Approved response |
|---|---|---|---|
| `TimeoutError: locator.click` | Broken Locator or Timing/Race | Trace action log, locator count, DOM snapshot at failure, navigation/network events | If target identity changed, repair locator in Page Object using shared locator order. If target appears later due to known async state, wait for a meaningful locator/URL/response condition. Never add a fixed sleep. |
| `Strict mode violation` | Broken Locator | Count and inspect matched elements, accessible names, DOM structure | Narrow by user-facing role/name or a verified stable test ID; scope to a meaningful container if the design supports it. Do not pick `.first()`/`.nth()` solely to silence ambiguity. |
| `expect(received).toBeVisible() failed` | Broken Locator, Timing/Race, or Genuine Application Bug | Assertion target, screenshot/DOM, trace chronology, design's expected state | Confirm intended state. Repair wrong target; synchronize on a meaningful async condition; if the UI truly lacks required behavior, classify app bug and stop. Never remove/relax the assertion to hide mismatch. |
| Locator resolves to 0 elements | Broken Locator or Timing/Race | Current DOM and trace before/after navigation/render | Verify accessible name/role/label and readiness. Update Page Object only if UI change is supported by design. |
| `Target closed`, navigation interrupted | Timing/Race or Test Data/State | Trace navigation, popup/download behavior, fixture teardown, worker logs | Correct lifecycle/event synchronization or fixture scope based on evidence; do not add retries blindly. |
| `401`/`403`, expired storage state | Test Data/State, unless design/contract proves product auth regression | Auth state expiry, environment, identity/role, API response, setup fixture | Refresh/recreate test auth state through approved setup and isolate roles. If valid credentials/state still produce contract-violating response, classify app bug. Never print tokens. |
| Duplicate/missing record or parallel-only failure | Test Data/State | Worker/test IDs, setup/cleanup, shared keys, database/API state | Use unique per-test data and deterministic cleanup/reset. Preserve independence. Do not disable parallelism as a concealment fix without proving an infrastructure constraint. |
| API response differs from approved contract/design | Genuine Application Bug or Test Data/State | Request/response, environment, payload, contract version, setup | If request/data/environment is valid and behavior violates approved source, stop and report defect. If setup is invalid, repair setup/data only. |
| `net::ERR_*`, connection refused | Test Data/State or environment; possibly app bug only with evidence | Base URL, service health, environment logs, dependency/virtualization status | Correct environment/configuration or report dependency outage. Do not change expected app result to accept outage. |

If evidence supports multiple causes, identify the primary cause and note contributors. If no category can be established, do not modify code.
