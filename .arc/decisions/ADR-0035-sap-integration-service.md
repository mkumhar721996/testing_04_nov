---
id: ADR-0035
category: component
title: SAP Integration Service
status: accepted
superseded_by: null
component_id: comp_sap_integration_service
responsibility: 'Thin Python microservice encapsulating all SAP communication: one
  consolidated RFC client library (SAP NetWeaver RFC SDK via PyRFC, replacing the
  existing JCo wrappers), configurable connections to the three SAP instances, internal
  part-search, place-order and get-orders endpoints parameterised by SAP instance,
  structured errors and logging.'
kind: api_service
serves:
- TESTING-04-NOV-EPIC-011
- TESTING-04-NOV-EPIC-012
- TESTING-04-NOV-EPIC-013
- TESTING-04-NOV-EPIC-014
- TESTING-04-NOV-EPIC-015
- TESTING-04-NOV-EPIC-017
split_reason: Different runtime (Python, SAP RFC SDK) from the TypeScript Core API;
  EPIC-012 requires it to hide SAP from business services. Language set by the human.
rule: All SAP access goes through the SAP Integration Service, written in Python;
  no other component holds SAP connections or RFC code.
evidence: 'human: ''SAP Integration Service should be in python''; EPIC-012, EPIC-011,
  EPIC-013..015'
contested: true
alternatives_considered:
- 'Spring Boot (Java) with JCo, as EPIC-012 states: lets the existing JCo wrapper
  code be lifted, but the human chose Python'
consequences:
- The existing JCo wrapper code from the three applications cannot be reused directly
  and must be re-implemented against the RFC SDK (EPIC-011 and EPIC-012 wording assumes
  Java)
- Needs the proprietary SAP NetWeaver RFC SDK in the container image
- Adds a third runtime (Python) beside TypeScript
---

## Context

human: 'SAP Integration Service should be in python'; EPIC-012, EPIC-011, EPIC-013..015

Serves: TESTING-04-NOV-EPIC-011, TESTING-04-NOV-EPIC-012, TESTING-04-NOV-EPIC-013, TESTING-04-NOV-EPIC-014, TESTING-04-NOV-EPIC-015, TESTING-04-NOV-EPIC-017.

## Decision

Thin Python microservice encapsulating all SAP communication: one consolidated RFC client library (SAP NetWeaver RFC SDK via PyRFC, replacing the existing JCo wrappers), configurable connections to the three SAP instances, internal part-search, place-order and get-orders endpoints parameterised by SAP instance, structured errors and logging.

Kept separate because Different runtime (Python, SAP RFC SDK) from the TypeScript Core API; EPIC-012 requires it to hide SAP from business services. Language set by the human..

## Alternatives considered

- Spring Boot (Java) with JCo, as EPIC-012 states: lets the existing JCo wrapper code be lifted, but the human chose Python

## Consequences

- The existing JCo wrapper code from the three applications cannot be reused directly and must be re-implemented against the RFC SDK (EPIC-011 and EPIC-012 wording assumes Java)
- Needs the proprietary SAP NetWeaver RFC SDK in the container image
- Adds a third runtime (Python) beside TypeScript
