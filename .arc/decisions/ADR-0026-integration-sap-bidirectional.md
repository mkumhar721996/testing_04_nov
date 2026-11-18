---
id: ADR-0026
category: integration_surface
title: 'Integration: SAP (bidirectional)'
status: accepted
superseded_by: null
component_id: comp_sap_integration_service
rule: SAP is reached only by the SAP Integration Service, with one configurable connection
  per SAP instance.
evidence: 'EPIC-011, EPIC-012: three existing SAP instances via ABAP RFC/BAPIs over
  JCo'
---

## Context

EPIC-011, EPIC-012: three existing SAP instances via ABAP RFC/BAPIs over JCo

## Decision

SAP (bidirectional)

Applies to SAP Integration Service.
