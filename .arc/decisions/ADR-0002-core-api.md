---
id: ADR-0002
category: component
title: Core API
status: accepted
superseded_by: null
component_id: comp_core_api
responsibility: Business logic, authorization and data access for the application;
  the single API the Web App calls.
kind: api_service
split_reason: Server-side runtime separate from the browser client.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: 'human: Backend API does data access'
- component_id: comp_authentication_service
  interaction: sync
  evidence: 'human: Authentication Service handles login, tokens, roles and permissions
    used by the API'
- component_id: comp_email_service
  interaction: async
  evidence: 'human: invitations and password resets are emailed'
evidence: "human: 'Backend API \u2013 Business logic, authentication, authorization,\
  \ and data access'"
---

## Context

human: 'Backend API – Business logic, authentication, authorization, and data access'

## Decision

Business logic, authorization and data access for the application; the single API the Web App calls.

Kept separate because Server-side runtime separate from the browser client..

## Talks to

- **Relational Database** (sync) — human: Backend API does data access
- **Authentication Service** (sync) — human: Authentication Service handles login, tokens, roles and permissions used by the API
- **Email Service** (async) — human: invitations and password resets are emailed
