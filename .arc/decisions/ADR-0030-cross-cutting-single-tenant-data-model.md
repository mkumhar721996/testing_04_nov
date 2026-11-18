---
id: ADR-0030
category: cross_cutting
title: 'Cross-cutting: Single-tenant data model'
status: accepted
superseded_by: null
component_id: null
rule: The deployment is single tenant; no per-tenant schema or database.
decision: One organisation per deployment; no tenant isolation layer needed.
evidence: 'accepted architecture: human ''PostgreSQL, single tenant'''
---

## Context

accepted architecture: human 'PostgreSQL, single tenant'

## Decision

One organisation per deployment; no tenant isolation layer needed.
