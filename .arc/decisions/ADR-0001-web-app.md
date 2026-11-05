---
id: ADR-0001
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: 'Browser-based UI for all user interactions: login, data management,
  business workflows and reports, for end users, managers/supervisors, administrators
  and support/operations teams.'
kind: web_ui
split_reason: 'Different runtime/client: runs in the browser.'
talks_to:
- component_id: comp_core_api
  interaction: sync
  evidence: 'human: browser UI backed by Backend API'
evidence: "human: 'Web UI (Frontend) \u2013 Browser-based user interface for all user\
  \ interactions'"
---

## Context

human: 'Web UI (Frontend) – Browser-based user interface for all user interactions'

## Decision

Browser-based UI for all user interactions: login, data management, business workflows and reports, for end users, managers/supervisors, administrators and support/operations teams.

Kept separate because Different runtime/client: runs in the browser..

## Talks to

- **Core API** (sync) — human: browser UI backed by Backend API
