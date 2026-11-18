# Boundary and Scenario Data Patterns

Derive boundary points from documented constraints. Candidates include required absent/null/empty/whitespace; numeric limits and just below/above; string lengths 0/1/max/max+1; Unicode/normalization; date/time edges and timezone; empty/one/max/max+1 collections, duplicates, mixed validity; missing references, stale versions, and concurrency.

Use only cases supported by schemas, requirements, or risks. Label inferred candidates and ask when expected behavior is ambiguous. Use synthetic values and state cleanup requirements.
