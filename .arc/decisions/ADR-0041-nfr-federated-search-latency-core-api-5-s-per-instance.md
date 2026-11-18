---
id: ADR-0041
category: nfr
title: "NFR: Federated search latency (Core API) \u2014 5 s per instance"
status: accepted
superseded_by: null
dimension: Federated search latency
metric: Per-SAP-instance timeout before partial results are returned
threshold: 5 s per instance
component_id: comp_core_api
needs_dedicated_tracking: true
rule: Federated search waits at most 5 s per SAP instance, then returns partial results
  flagged as partial.
evidence: recommended default, accepted by the human without review; EPIC-013
---

## Context

recommended default, accepted by the human without review; EPIC-013

## Decision

Per-SAP-instance timeout before partial results are returned: 5 s per instance

Applies to Core API.
