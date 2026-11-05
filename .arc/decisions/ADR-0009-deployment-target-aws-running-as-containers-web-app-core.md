---
id: ADR-0009
category: deployment_target
title: "Deployment target: AWS, running as containers (Web App, Core API and Background\
  \ Worker as\u2026"
status: accepted
superseded_by: null
component_id: null
decision: AWS, running as containers (Web App, Core API and Background Worker as container
  workloads). Primary region us-east-1 with a cross-region replica of the data in
  us-west-2; container orchestration service and environments (prod, staging) still
  open.
evidence: 'human: ''AWS, containers''; ''One region with a cross-region replica'';
  ''us-east-1 with us-west-2.'''
contested: true
alternatives_considered:
- 'Single region: no disaster-recovery copy'
- 'Active-passive across two regions: not chosen by the human'
consequences:
- Database and object data must replicate from us-east-1 to us-west-2
- Failover to the replica is a recovery procedure, not automatic active traffic
---

## Context

human: 'AWS, containers'; 'One region with a cross-region replica'; 'us-east-1 with us-west-2.'

## Decision

AWS, running as containers (Web App, Core API and Background Worker as container workloads). Primary region us-east-1 with a cross-region replica of the data in us-west-2; container orchestration service and environments (prod, staging) still open.

## Alternatives considered

- Single region: no disaster-recovery copy
- Active-passive across two regions: not chosen by the human

## Consequences

- Database and object data must replicate from us-east-1 to us-west-2
- Failover to the replica is a recovery procedure, not automatic active traffic
