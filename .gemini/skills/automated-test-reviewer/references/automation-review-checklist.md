# Automated Test Review Checklist

## Correctness and coverage
- Is the test linked to a requirement, risk, condition, or strategy item?
- Does it assert meaningful behavior and relevant negative/boundary cases?
- Could it pass when behavior is broken due to weak assertions or swallowed errors?
## Reliability
- Is setup deterministic and isolated? Is cleanup/reset reliable?
- Are waits condition-based? Are retries bounded and justified?
- Are shared data, ordering, time, network, and environment dependencies controlled?
## Maintainability
- Does it follow project conventions? Are abstractions useful and intent clear?
- Are failures diagnostic? Is sensitive data kept out of code/logs?
## Evidence
- Separate review conclusions from tests actually run. Give precise file/line evidence and severity.
- Check virtualization fidelity and remaining real integration coverage.
- Do not rewrite or execute tests unless asked and within scope.
