---
id: ADR-0017
category: component
title: Core API
status: accepted
superseded_by: null
component_id: comp_core_api
responsibility: Business logic, authorization and data access for every domain (defects,
  parts search, orders, storefront, organizations); the single API the Web App calls.
  Calls the SAP Integration Service for all SAP access.
kind: api_service
serves:
- TESTING-04-NOV-EPIC-003
- TESTING-04-NOV-EPIC-004
- TESTING-04-NOV-EPIC-005
- TESTING-04-NOV-EPIC-006
- TESTING-04-NOV-EPIC-007
- TESTING-04-NOV-EPIC-008
- TESTING-04-NOV-EPIC-009
- TESTING-04-NOV-EPIC-010
- TESTING-04-NOV-EPIC-013
- TESTING-04-NOV-EPIC-014
- TESTING-04-NOV-EPIC-015
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
split_reason: Server-side runtime separate from the browser client.
talks_to:
- component_id: comp_relational_database
  interaction: sync
  evidence: accepted architecture seam
- component_id: comp_authentication_service
  interaction: sync
  evidence: accepted architecture seam; STORY-048
- component_id: comp_email_service
  interaction: async
  evidence: accepted architecture seam
- component_id: comp_sap_integration_service
  interaction: sync
  evidence: 'EPIC-013, 014, 015: search, placeOrder, getOrders call the SAP service''s
    internal endpoints'
- component_id: comp_object_storage
  interaction: sync
  evidence: recommended default, accepted by the human without review; STORY-017
rule: All business rules, authorization checks and database access live in the Core
  API; clients never reach the database directly.
evidence: 'human: ''All of them in one system''; scan: services/api'
---

## Context

human: 'All of them in one system'; scan: services/api

Serves: TESTING-04-NOV-EPIC-003, TESTING-04-NOV-EPIC-004, TESTING-04-NOV-EPIC-005, TESTING-04-NOV-EPIC-006, TESTING-04-NOV-EPIC-007, TESTING-04-NOV-EPIC-008, TESTING-04-NOV-EPIC-009, TESTING-04-NOV-EPIC-010, TESTING-04-NOV-EPIC-013, TESTING-04-NOV-EPIC-014, TESTING-04-NOV-EPIC-015, TESTING-04-NOV-EPIC-019, TESTING-04-NOV-EPIC-020, TESTING-04-NOV-EPIC-021, TESTING-04-NOV-EPIC-022, TESTING-04-NOV-EPIC-023, TESTING-04-NOV-EPIC-024, TESTING-04-NOV-EPIC-025, TESTING-04-NOV-EPIC-026, TESTING-04-NOV-EPIC-027, TESTING-04-NOV-EPIC-028, TESTING-04-NOV-EPIC-029, TESTING-04-NOV-EPIC-030, TESTING-04-NOV-EPIC-031, TESTING-04-NOV-EPIC-032.

## Decision

Business logic, authorization and data access for every domain (defects, parts search, orders, storefront, organizations); the single API the Web App calls. Calls the SAP Integration Service for all SAP access.

Kept separate because Server-side runtime separate from the browser client..

## Talks to

- **Relational Database** (sync) — accepted architecture seam
- **Authentication Service** (sync) — accepted architecture seam; STORY-048
- **Email Service** (async) — accepted architecture seam
- **SAP Integration Service** (sync) — EPIC-013, 014, 015: search, placeOrder, getOrders call the SAP service's internal endpoints
- **Object Storage** (sync) — recommended default, accepted by the human without review; STORY-017
