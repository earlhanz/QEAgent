# Test Level Selection Guide

Choose layers from architecture, risk, feedback needs, and evidence. Layers complement one another; avoid placing every check in slow end-to-end tests.

- **Unit:** isolated logic and edge cases; fast feedback.
- **Component:** module behavior with controlled boundaries.
- **API/service:** request/response behavior, validation, authorization, errors, without UI cost.
- **Contract:** producer/consumer compatibility; complements integration tests.
- **Integration:** interactions across selected real components/dependencies.
- **UI/end-to-end:** a small set of critical user journeys and cross-layer risks.
- **Exploratory/manual:** discovery, usability, ambiguous behavior, visual judgment, or where automation cost exceeds value.
- **Non-functional:** accessibility, performance, security/privacy, resilience, compatibility, recovery, localization, operations, where risks or requirements warrant them.

For each recommendation explain fit, what it proves and cannot prove, dependencies, and feedback/maintenance tradeoffs. Do not prescribe ratios or tools without evidence.
