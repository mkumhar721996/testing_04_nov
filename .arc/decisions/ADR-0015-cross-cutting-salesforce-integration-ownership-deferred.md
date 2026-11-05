---
id: ADR-0015
category: cross_cutting
title: 'Cross-cutting: Salesforce integration ownership deferred'
status: accepted
superseded_by: null
component_id: null
decision: Two-way Salesforce sync goes through a dedicated Salesforce integration
  layer, called by the Background Worker and/or the Core API. Which component owns
  the communication is confirmed during detailed design.
evidence: 'human: ''Salesforce integration will be performed by the Background Worker
  and/or Core API through a dedicated Salesforce integration layer...'''
---

## Context

human: 'Salesforce integration will be performed by the Background Worker and/or Core API through a dedicated Salesforce integration layer...'

## Decision

Two-way Salesforce sync goes through a dedicated Salesforce integration layer, called by the Background Worker and/or the Core API. Which component owns the communication is confirmed during detailed design.
