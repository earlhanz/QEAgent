# Service Virtualization Guidelines

Virtualize when isolation, determinism, failure simulation, availability, speed, or cost justifies it. Retain tests against real dependencies where needed.

Document contract source/version and fidelity; operations and request matching; responses/status/schema; error, timeout, latency, retry, throttle, outage cases; state, reset, isolation, parallel safety; auth without embedded secrets; simulated behavior and what real integration must still prove.

Avoid permissive matchers and canned responses that cannot catch contract drift. Prefer contract checks where supported. Keep behavior deterministic, reviewable, and easy to reset.
