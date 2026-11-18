---
id: ADR-0029
category: cross_cutting
title: 'Cross-cutting: No compliance regime or data-residency requirement'
status: accepted
superseded_by: null
component_id: null
rule: Data is encrypted in transit and at rest; audit history is kept in the database.
decision: No compliance framework or residency restriction applies; data may live
  in us-east-1 with a replica in us-west-2. Encryption in transit and at rest and
  audit history in the database still apply.
evidence: 'accepted architecture: human ''None'''
---

## Context

accepted architecture: human 'None'

## Decision

No compliance framework or residency restriction applies; data may live in us-east-1 with a replica in us-west-2. Encryption in transit and at rest and audit history in the database still apply.
