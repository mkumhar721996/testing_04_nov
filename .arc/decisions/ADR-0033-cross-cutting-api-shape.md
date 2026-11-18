---
id: ADR-0033
category: cross_cutting
title: 'Cross-cutting: API shape'
status: accepted
superseded_by: null
component_id: null
rule: The Web App talks to one API, the Core API; add no per-domain services or gateway
  without a recorded decision.
decision: One Core API serves all domains and the Web App calls it directly, with
  no gateway or BFF; SAP access is the only split-out service.
evidence: recommended default, accepted by the human without review
---

## Context

recommended default, accepted by the human without review

## Decision

One Core API serves all domains and the Web App calls it directly, with no gateway or BFF; SAP access is the only split-out service.
