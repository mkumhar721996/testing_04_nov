---
id: ADR-0013
category: cross_cutting
title: 'Cross-cutting: No compliance regime or data-residency requirement'
status: accepted
superseded_by: null
component_id: null
decision: 'No compliance framework (GDPR, SOC 2, HIPAA) or residency restriction applies;
  data may live in us-east-1 with a replica in us-west-2. Standard practice still
  applies: encryption in transit and at rest, and audit history kept in the database.'
evidence: 'human: ''None'' (compliance and data residency)'
---

## Context

human: 'None' (compliance and data residency)

## Decision

No compliance framework (GDPR, SOC 2, HIPAA) or residency restriction applies; data may live in us-east-1 with a replica in us-west-2. Standard practice still applies: encryption in transit and at rest, and audit history kept in the database.
