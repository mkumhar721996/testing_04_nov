---
id: ADR-0016
category: component
title: Web App
status: accepted
superseded_by: null
component_id: comp_web_app
responsibility: 'Browser-based UI (React + TypeScript SPA) for all user journeys:
  sign-in and registration, defects, dashboards, parts search, cart and orders, storefront,
  organizations; talks only to the Core API.'
kind: web_ui
serves:
- TESTING-04-NOV-EPIC-003
- TESTING-04-NOV-EPIC-004
- TESTING-04-NOV-EPIC-005
- TESTING-04-NOV-EPIC-007
- TESTING-04-NOV-EPIC-008
- TESTING-04-NOV-EPIC-016
- TESTING-04-NOV-EPIC-019
- TESTING-04-NOV-EPIC-020
- TESTING-04-NOV-EPIC-021
- TESTING-04-NOV-EPIC-022
- TESTING-04-NOV-EPIC-023
- TESTING-04-NOV-EPIC-024
- TESTING-04-NOV-EPIC-025
- TESTING-04-NOV-EPIC-026
- TESTING-04-NOV-EPIC-027
- TESTING-04-NOV-EPIC-028
- TESTING-04-NOV-EPIC-029
- TESTING-04-NOV-EPIC-030
- TESTING-04-NOV-EPIC-031
- TESTING-04-NOV-EPIC-032
split_reason: 'Different runtime/client: runs in the browser.'
talks_to:
- component_id: comp_core_api
  interaction: sync
  evidence: accepted architecture seam
rule: The Web App calls only the Core API (and the identity provider for sign-in);
  it never reaches the database or third parties directly.
evidence: 'human: ''All of them in one system''; scan: apps/web'
---

## Context

human: 'All of them in one system'; scan: apps/web

Serves: TESTING-04-NOV-EPIC-003, TESTING-04-NOV-EPIC-004, TESTING-04-NOV-EPIC-005, TESTING-04-NOV-EPIC-007, TESTING-04-NOV-EPIC-008, TESTING-04-NOV-EPIC-016, TESTING-04-NOV-EPIC-019, TESTING-04-NOV-EPIC-020, TESTING-04-NOV-EPIC-021, TESTING-04-NOV-EPIC-022, TESTING-04-NOV-EPIC-023, TESTING-04-NOV-EPIC-024, TESTING-04-NOV-EPIC-025, TESTING-04-NOV-EPIC-026, TESTING-04-NOV-EPIC-027, TESTING-04-NOV-EPIC-028, TESTING-04-NOV-EPIC-029, TESTING-04-NOV-EPIC-030, TESTING-04-NOV-EPIC-031, TESTING-04-NOV-EPIC-032.

## Decision

Browser-based UI (React + TypeScript SPA) for all user journeys: sign-in and registration, defects, dashboards, parts search, cart and orders, storefront, organizations; talks only to the Core API.

Kept separate because Different runtime/client: runs in the browser..

## Talks to

- **Core API** (sync) — accepted architecture seam
