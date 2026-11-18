---
id: ADR-0022
category: component
title: SAP Integration Service
status: accepted
superseded_by: null
component_id: comp_sap_integration_service
responsibility: 'Thin Spring Boot (Java) microservice encapsulating all SAP communication:
  one consolidated JCo library, configurable connections to the three SAP instances,
  internal part-search, place-order and get-orders endpoints parameterised by SAP
  instance, structured errors and logging.'
kind: api_service
serves:
- TESTING-04-NOV-EPIC-011
- TESTING-04-NOV-EPIC-012
- TESTING-04-NOV-EPIC-013
- TESTING-04-NOV-EPIC-014
- TESTING-04-NOV-EPIC-015
- TESTING-04-NOV-EPIC-017
split_reason: Different runtime (Java/Spring Boot with JCo) from the TypeScript Core
  API; EPIC-012 requires it to hide SAP from business services
rule: All SAP access goes through the SAP Integration Service; no other component
  holds SAP connections or JCo code.
evidence: 'EPIC-012 (Spring Boot SAP Integration Microservice), EPIC-011, EPIC-013..015;
  human: ''All of them in one system'''
---

## Context

EPIC-012 (Spring Boot SAP Integration Microservice), EPIC-011, EPIC-013..015; human: 'All of them in one system'

Serves: TESTING-04-NOV-EPIC-011, TESTING-04-NOV-EPIC-012, TESTING-04-NOV-EPIC-013, TESTING-04-NOV-EPIC-014, TESTING-04-NOV-EPIC-015, TESTING-04-NOV-EPIC-017.

## Decision

Thin Spring Boot (Java) microservice encapsulating all SAP communication: one consolidated JCo library, configurable connections to the three SAP instances, internal part-search, place-order and get-orders endpoints parameterised by SAP instance, structured errors and logging.

Kept separate because Different runtime (Java/Spring Boot with JCo) from the TypeScript Core API; EPIC-012 requires it to hide SAP from business services.
