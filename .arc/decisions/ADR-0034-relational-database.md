---
id: ADR-0034
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Persistent storage for users, roles, defects, history, Distributor
  and SAP-mapping data, carts, parent/child orders, retry queue and storefront data;
  runs on Amazon RDS for PostgreSQL, single tenant, cross-region replica; schema via
  versioned migrations.
kind: managed_service
serves:
- TESTING-04-NOV-EPIC-003
- TESTING-04-NOV-EPIC-004
- TESTING-04-NOV-EPIC-009
- TESTING-04-NOV-EPIC-014
- TESTING-04-NOV-EPIC-017
split_reason: Backing service the project uses but does not build; owns the data.
rule: The schema changes only through versioned migrations owned by the Core API.
evidence: recommended default, accepted by the human without review; EPIC-009, EPIC-017
---

## Context

recommended default, accepted by the human without review; EPIC-009, EPIC-017

Serves: TESTING-04-NOV-EPIC-003, TESTING-04-NOV-EPIC-004, TESTING-04-NOV-EPIC-009, TESTING-04-NOV-EPIC-014, TESTING-04-NOV-EPIC-017.

## Decision

Persistent storage for users, roles, defects, history, Distributor and SAP-mapping data, carts, parent/child orders, retry queue and storefront data; runs on Amazon RDS for PostgreSQL, single tenant, cross-region replica; schema via versioned migrations.

Kept separate because Backing service the project uses but does not build; owns the data..
