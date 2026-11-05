---
id: ADR-0014
category: cross_cutting
title: 'Cross-cutting: Single-tenant data model'
status: accepted
superseded_by: null
component_id: null
decision: One organisation per deployment; no tenant isolation layer (shared tables,
  schema or database per tenant) is needed.
evidence: 'human: ''PostgreSQL, single tenant'''
---

## Context

human: 'PostgreSQL, single tenant'

## Decision

One organisation per deployment; no tenant isolation layer (shared tables, schema or database per tenant) is needed.
