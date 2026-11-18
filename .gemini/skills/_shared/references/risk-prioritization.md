# QE Risk Prioritization

Use project evidence to decide test depth and order. Avoid false precision or numeric scores unless the team has an agreed model.

Consider impact (users, operations, data, safety, privacy, security, compliance), likelihood (complexity, change frequency, defect history, dependency volatility), detectability/recoverability, and reach. Give critical journeys and irreversible or sensitive operations deeper coverage. Include meaningful negative, boundary, permission, state-transition, and recovery scenarios when supported. Balance value against runtime, flakiness, environment access, and maintenance. State rationale; mark unknown inputs unknown. Do not treat test count or automation percentage as a quality outcome.
