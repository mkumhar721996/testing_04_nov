---
id: ADR-0028
category: integration_surface
title: 'Integration: Stripe API (outbound)'
status: accepted
superseded_by: null
component_id: comp_core_api
rule: Card data never touches the application's servers or database; payments go through
  Stripe.
evidence: recommended default, accepted by the human without review; EPIC-024
---

## Context

recommended default, accepted by the human without review; EPIC-024

## Decision

Stripe API (outbound)

Applies to Core API.
