# Coverage and Traceability Model

Organize coverage as source → test condition → test case → execution evidence. Sources include design elements, requirements, stories, acceptance criteria, risks, and quality attributes. Test conditions define behaviors, states, boundaries, permissions, integrations, or quality concerns. Test cases may be manual or automated. Execution evidence records an actual run and result; never infer it from a planned test.

Assess coverage by meaningful conditions and risk, not raw test count. Identify covered, partial, uncovered, blocked, not applicable, and unassessed areas with rationale. Preserve many-to-many relationships. Use `docs/<project>/traceability-matrix.xlsx` as authoritative when present. Report missing/stale links without inventing them.
