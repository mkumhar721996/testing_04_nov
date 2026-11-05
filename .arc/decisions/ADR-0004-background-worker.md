---
id: ADR-0004
category: component
title: Background Worker
status: accepted
superseded_by: null
component_id: comp_background_worker
responsibility: Scheduled tasks, notification dispatch, report generation, cleanup
  jobs and integrations.
kind: worker
split_reason: Background work with schedule-driven, non-request lifecycle, kept out
  of the API request path.
talks_to:
- component_id: comp_relational_database
  interaction: shared-storage
  evidence: 'human: workers run reports, cleanup and scheduled tasks over application
    data'
- component_id: comp_email_service
  interaction: async
  evidence: 'human: workers send notifications; Email/Notification Service sends emails'
- component_id: comp_core_api
  interaction: sync
  evidence: 'proposed: worker integrations with ERP/CRM run in the Background Worker
    per human''s original list'
evidence: "human: 'Background Jobs/Workers \u2013 Scheduled tasks, notifications,\
  \ report generation, cleanup jobs, and integrations'"
---

## Context

human: 'Background Jobs/Workers – Scheduled tasks, notifications, report generation, cleanup jobs, and integrations'

## Decision

Scheduled tasks, notification dispatch, report generation, cleanup jobs and integrations.

Kept separate because Background work with schedule-driven, non-request lifecycle, kept out of the API request path..

## Talks to

- **Relational Database** (shared-storage) — human: workers run reports, cleanup and scheduled tasks over application data
- **Email Service** (async) — human: workers send notifications; Email/Notification Service sends emails
- **Core API** (sync) — proposed: worker integrations with ERP/CRM run in the Background Worker per human's original list
