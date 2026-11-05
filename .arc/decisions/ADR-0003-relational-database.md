---
id: ADR-0003
category: component
title: Relational Database
status: accepted
superseded_by: null
component_id: comp_relational_database
responsibility: Persistent storage for users, application data, settings and audit
  history; runs on PostgreSQL, single tenant, with a cross-region replica.
kind: infrastructure
split_reason: Backing service the project uses but does not build; owns the data.
evidence: 'human: ''PostgreSQL, single tenant'''
---

## Context

human: 'PostgreSQL, single tenant'

## Decision

Persistent storage for users, application data, settings and audit history; runs on PostgreSQL, single tenant, with a cross-region replica.

Kept separate because Backing service the project uses but does not build; owns the data..
