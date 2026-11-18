# Manual Test Design Techniques

Choose methods based on behavior and risk; do not force all methods into every feature.

- **Equivalence partitions:** representative valid/invalid input groups.
- **Boundary analysis:** minimum/maximum, just below/above, empty, zero, length/range limits.
- **Decision tables:** condition combinations that produce distinct outcomes.
- **State transitions:** valid/invalid changes, repeated actions, recovery.
- **Pairwise/combinatorial selection:** reduce configuration space while preserving important interactions; explain exclusions.
- **Role/permission matrix:** allowed and denied operations by role.
- **Exploratory charters:** informed by risks; label exploratory intent.
- **Risk-based scenarios:** critical paths, integrity, privacy/security, high-impact dependencies.

Expected results must come from sources. Techniques identify conditions; they do not authorize invented behavior.
