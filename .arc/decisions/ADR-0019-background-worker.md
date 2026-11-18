---
id: ADR-0019
category: component
title: Background Worker
status: accepted
superseded_by: null
component_id: comp_background_worker
responsibility: Scheduled tasks, notification dispatch, report generation, cleanup
  jobs, child-order retry (configurable schedule, bounded retries, exponential back-off)
  and integrations.
kind: worker
serves:
- TESTING-04-NOV-EPIC-006
- TESTING-04-NOV-EPIC-014
split_reason: Background work with schedule-driven, non-request lifecycle, kept out
  of the API request path.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: accepted architecture seam
- component_id: comp_email_service
  interaction: async
  evidence: accepted architecture seam
- component_id: comp_core_api
  interaction: sync
  evidence: accepted architecture seam
- component_id: comp_sap_integration_service
  interaction: sync
  evidence: 'EPIC-014: failed child orders are retried through the SAP integration'
rule: Scheduled, notification and retry work runs in the Background Worker, never
  in the API request path; it shares the database but does not own the schema.
evidence: 'EPIC-006, EPIC-014; scan: services/worker'
---

## Context

EPIC-006, EPIC-014; scan: services/worker

Serves: TESTING-04-NOV-EPIC-006, TESTING-04-NOV-EPIC-014.

## Decision

Scheduled tasks, notification dispatch, report generation, cleanup jobs, child-order retry (configurable schedule, bounded retries, exponential back-off) and integrations.

Kept separate because Background work with schedule-driven, non-request lifecycle, kept out of the API request path..

## Talks to

- **Relational Database** (shared-storage) — accepted architecture seam
- **Email Service** (async) — accepted architecture seam
- **Core API** (sync) — accepted architecture seam
- **SAP Integration Service** (sync) — EPIC-014: failed child orders are retried through the SAP integration
