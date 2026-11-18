---
id: ADR-0038
category: cross_cutting
title: 'Cross-cutting: SAP network path'
status: accepted
superseded_by: null
component_id: null
rule: SAP traffic leaves AWS only through the site-to-site VPN; SAP instances are
  never exposed publicly.
decision: The SAP Integration Service reaches the three SAP instances over a site-to-site
  VPN from the AWS VPC; the SAP basis/network team owns the SAP-side access.
evidence: recommended default, accepted by the human without review
---

## Context

recommended default, accepted by the human without review

## Decision

The SAP Integration Service reaches the three SAP instances over a site-to-site VPN from the AWS VPC; the SAP basis/network team owns the SAP-side access.
