---
id: ADR-0031
category: cross_cutting
title: 'Cross-cutting: Distributor and Organization data scoping'
status: accepted
superseded_by: null
component_id: null
rule: Every query and SAP call is scoped to the caller's Distributor or Organization
  on the server.
decision: Users see only their own Distributor's (SAP customer-ID filtering plus database
  joins) or Organization's data, enforced server-side within the single-tenant deployment
  on shared tables; isolation is demonstrable with seed data.
evidence: 'EPIC-015, EPIC-010, EPIC-021, STORY-029; proposed: row-level scoping'
---

## Context

EPIC-015, EPIC-010, EPIC-021, STORY-029; proposed: row-level scoping

## Decision

Users see only their own Distributor's (SAP customer-ID filtering plus database joins) or Organization's data, enforced server-side within the single-tenant deployment on shared tables; isolation is demonstrable with seed data.
